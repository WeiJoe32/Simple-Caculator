# Windows Python Popup Calculator

A sleek, borderless, dark-themed desktop popup calculator built with Python `tkinter` and integrated into the Windows system tray using `pystray`.

## What It Does
- **System Tray Integration**: Running the application adds a custom calculator icon (🧮) to your Windows system tray. 
- **Activation (Left-Click)**: Single left-clicking or double-clicking the tray icon immediately pops the calculator window into view in the center of your screen.
- **Auto-Dismissal**: Pressing `Esc` or clicking anywhere outside the calculator window immediately hides the application back into the background, keeping your workspace clean.
- **Exit (Right-Click)**: Right-clicking the tray icon and selecting `Exit` completely stops the program and releases system resources.
- **Dark UI Styling**: A custom, borderless dark-themed palette (`#1e1e24` and `#0f0f12`) with hover feedback micro-animations.
- **Interactive Dragging**: Drag the window by holding and moving the title bar (`🧮 CALC`).
- **Standard Calculations**: Supports basic mathematical operations (`+`, `-`, `*`, `/`) with safety-checked input evaluation.
- **Physical Keyboard Support**: Allows typing numbers, decimals, backspacing, clearing (`C` or `Esc`), and executing (`Enter` or `=`) directly from your desktop keyboard.

## How to Run It
1. Ensure Python 3.x is installed on your Windows machine.
2. Install the system tray and image processing dependencies using pip:
   ```cmd
   pip install pystray pillow
   ```
3. Launch the calculator:
   ```cmd
   python calculator.py
   ```
   *Note: The application starts minimized inside the system tray. Look for the calculator icon in the lower-right notification area.*
4. Double-click/left-click the icon to open the calculator. Press `Esc` or click outside to dismiss it.

## Files Involved
- [instruction-popup-calculator.md](file:///C:/Users/soowe/OneDrive/Documents/Obsidian/Artificial%20Intelligence/Antigravity/Antigravity-Projects/popup-calculator/instruction-popup-calculator.md) - This instruction guide.
- [calculator.py](file:///C:/Users/soowe/OneDrive/Documents/Obsidian/Artificial%20Intelligence/Antigravity/Antigravity-Projects/popup-calculator/calculator.py) - The main Tkinter application script and system tray runner.
