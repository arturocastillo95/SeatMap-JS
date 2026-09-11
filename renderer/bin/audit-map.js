#!/usr/bin/env node

import { runAuditCli } from "../audit/cli.js";

process.exitCode = await runAuditCli(process.argv.slice(2));
