# Threat model

RansomWatch detects behavior associated with ransomware; it does not guarantee
prevention or attribution. Core operation is unprivileged and local-only. Collectors
fail safely when files disappear or permissions change during a scan and never access
file contents.

The included simulator does not encrypt or overwrite data. It creates empty marker
files and renames only files matching its own naming convention inside a directory
containing `.ransomwatch-sandbox`. The tool has no automatic containment or process
termination capability.

Process attribution reads process metadata and accessible open-file handle paths via
the operating system. It does not inspect process memory or file contents. Access
denials and exited processes are ignored, attribution expires after a short window,
and unmatched events remain unattributed rather than being guessed.
