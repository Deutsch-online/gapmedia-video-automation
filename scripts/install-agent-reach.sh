#!/bin/bash
# Installs the Agent Reach command line (https://github.com/Panniantong/Agent-Reach, MIT) into its own virtual
# environment, pinned to the reviewed commit. Safe by default: it only checks the machine (no --system, no cookies,
# no logins: see "Agent Reach" in CLAUDE.md). Usage: bash scripts/install-agent-reach.sh ; then ~/.agent-reach-venv/bin/agent-reach doctor
set -e
PIN=a19a171fa980a0785849596492e0af4db800c82f
python3 -m venv ~/.agent-reach-venv
~/.agent-reach-venv/bin/pip install -q "git+https://github.com/Panniantong/agent-reach@$PIN"
~/.agent-reach-venv/bin/agent-reach install --env=auto
~/.agent-reach-venv/bin/agent-reach doctor || true
