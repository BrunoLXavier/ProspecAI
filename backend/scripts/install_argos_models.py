"""Build-only Argos Translate installer.

This script intentionally avoids runtime fallback behavior. It only
attempts to download and install .argosmodel packages when the
`ARGOS_MODEL_URLS` environment variable is set (comma-separated URLs).
The Dockerfile should set `ARGOS_MODEL_URLS` at build time so installs
are deterministic.
"""

import logging
import os
import tempfile

logging.basicConfig(level=logging.INFO)

try:
    import argostranslate.package as at_package
    import argostranslate.translate as at_translate
except Exception as e:
    logging.error(f"Argos modules not available: {e}")
    raise

try:
    import requests
except Exception:
    requests = None


def install_from_urls(urls):
    if not urls:
        logging.info("No ARGOS_MODEL_URLS provided; skipping Argos model installation (build-only)")
        return
    if not requests:
        logging.warning("Requests not available; cannot download Argos models")
        return

    for url in urls:
        try:
            logging.info(f"Downloading Argos package from URL: {url}")
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            with tempfile.NamedTemporaryFile(delete=False, suffix='.argosmodel') as f:
                f.write(r.content)
                tmp_path = f.name
            try:
                at_package.install_from_path(tmp_path)
                logging.info(f"Installed Argos package from {url}")
            except Exception as e:
                logging.warning(f"Failed to install package from {url}: {e}")
        except Exception as e:
            logging.warning(f"Failed to download Argos package from {url}: {e}")


if __name__ == '__main__':
    urls_env = os.getenv('ARGOS_MODEL_URLS', '')
    urls = [u.strip() for u in urls_env.split(',') if u.strip()]
    install_from_urls(urls)

    # Log installed languages for visibility
    try:
        langs = at_translate.get_installed_languages()
        logging.info(f"Installed Argos languages: {[l.code for l in langs]}")
    except Exception as e:
        logging.warning(f"Could not list installed Argos languages: {e}")
