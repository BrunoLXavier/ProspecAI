#!/usr/bin/env python3
"""Compatibility wrapper to run seeds using the existing run_seeds_fixed implementation.

This module exists so the entrypoint can call `python -m backend.scripts.run_seeds`.
"""
from __future__ import annotations

from .run_seeds_fixed import main


def run():
    return main()


if __name__ == '__main__':
    main()
