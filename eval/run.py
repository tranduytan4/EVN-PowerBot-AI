import sys
from pathlib import Path

# Forwarding entrypoint to langgraph_lab.eval
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from langgraph_lab.eval.run import main

if __name__ == "__main__":
    main()
