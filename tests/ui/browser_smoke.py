#!/usr/bin/env python3
import contextlib
import http.server
import os
from pathlib import Path
import shutil
import socket
import threading

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("SKIP: Python Playwright is not installed; browser smoke test not run.")
    raise SystemExit(0)

ROOT = Path(__file__).resolve().parents[2] / "public"

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

@contextlib.contextmanager
def serve_public():
    previous = Path.cwd()
    os.chdir(ROOT)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}/"
    finally:
        server.shutdown()
        thread.join(timeout=5)
        os.chdir(previous)


def launch_browser(playwright):
    executable = (
        os.environ.get("CHROMIUM_PATH")
        or shutil.which("chromium")
        or shutil.which("chromium-browser")
        or shutil.which("google-chrome")
    )
    kwargs = {"headless": True, "args": ["--no-sandbox"]}
    if executable:
        kwargs["executable_path"] = executable
    return playwright.chromium.launch(**kwargs)


def main():
    with serve_public() as url, sync_playwright() as playwright:
        browser = launch_browser(playwright)
        page = browser.new_page()
        try:
            page.goto(url, wait_until="networkidle")
        except Exception as exc:
            if "ERR_BLOCKED_BY_ADMINISTRATOR" in str(exc):
                browser.close()
                print("SKIP: browser navigation is blocked by the execution environment.")
                return
            raise

        group_labels = page.locator("#exampleSelect optgroup").evaluate_all(
            "groups => groups.map(group => group.label)"
        )
        assert group_labels[0] == "★ Recommended"
        assert "General" in group_labels
        assert "Parallel Workloads" in group_labels
        assert "Resources" in group_labels
        assert "Scheduling" in group_labels
        assert "Compatibility" in group_labels

        recommended = page.locator('#exampleSelect optgroup[label="★ Recommended"] option').evaluate_all(
            "options => options.map(option => option.textContent)"
        )
        assert recommended == ["Basic Job", "Send Email", "MPI Job", "GPU Job"]

        page.select_option("#exampleSelect", "send-email")
        assert "#PBS -M user@example.com" in page.input_value("#sourceInput")
        assert "#SBATCH --mail-user=user@example.com" in page.input_value("#targetOutput")

        page.select_option("#sourceScheduler", "slurm")
        page.select_option("#exampleSelect", "send-email")
        assert "#SBATCH --mail-user=user@example.com" in page.input_value("#sourceInput")
        assert "#PBS -M user@example.com" in page.input_value("#targetOutput")
        assert page.locator("#targetDialectField").is_visible()

        page.click("#swapBtn")
        assert page.input_value("#sourceScheduler") == "pbs"
        assert page.input_value("#targetScheduler") == "slurm"
        assert "#PBS -M user@example.com" in page.input_value("#sourceInput")

        page.click("#clearBtn")
        assert page.input_value("#sourceInput") == ""
        assert page.input_value("#targetOutput") == ""
        assert page.text_content("#inputLineCount") == "0 lines"

        browser.close()

    print("PASS: browser UI smoke test")


if __name__ == "__main__":
    main()
