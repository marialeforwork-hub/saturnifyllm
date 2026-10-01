#!/usr/bin/env python3
"""Export verbal question data from one or more SATurnify quiz HTML files."""

from quiz_json_export import run_cli


if __name__ == "__main__":
    raise SystemExit(run_cli("verbal"))