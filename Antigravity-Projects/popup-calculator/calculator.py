import tkinter as tk
from tkinter import font
import sys
import pystray
from pystray import MenuItem as item
from PIL import Image, ImageDraw

class PopupCalculator:
    def __init__(self, root):
        self.root = root
        self.root.title("Antigravity Calc")
        
        # Make window borderless
        self.root.overrideredirect(True)
        
        # Keep window on top
        self.root.attributes("-topmost", True)
        
        # Custom Fonts
        self.display_font = font.Font(family="Consolas", size=24, weight="bold")
        self.btn_font = font.Font(family="Segoe UI", size=14, weight="normal")
        self.title_font = font.Font(family="Segoe UI", size=10, weight="bold")
        
        # Color Palette (Dark Theme)
        self.color_bg = "#1e1e24"          # Dark slate purple/gray
        self.color_titlebar = "#15151a"    # Very dark gray for title bar
        self.color_display_bg = "#0f0f12"  # Deep black/gray for display
        self.color_display_fg = "#f1f1f5"  # Soft white
        
        self.color_btn_num = "#282930"     # Gray for number keys
        self.color_btn_num_hover = "#353742"
        self.color_btn_op = "#363842"      # Slightly lighter for operators
        self.color_btn_op_hover = "#474a58"
        self.color_btn_action = "#4a3e3e"  # Dark reddish for Clear / Backspace
        self.color_btn_action_hover = "#5c4c4c"
        
        self.color_btn_equals = "#6366f1"  # Indigo for equals key
        self.color_btn_equals_hover = "#7c7ffd"
        
        # Setup Window Position and Size
        self.width = 320
        self.height = 420
        self.center_window()
        
        # State Variables
        self.expression = ""
        self.should_reset = False
        
        # Build UI Components
        self.create_titlebar()
        self.create_display()
        self.create_keypad()
        
        # Bind Dismissal Events
        self.root.bind("<FocusOut>", self.on_focus_out)
        self.root.bind("<Escape>", lambda e: self.hide_window())
        
        # Bind Numeric/Keyboard typing
        self.root.bind("<Key>", self.on_key_press)
        
        # Setup System Tray Icon
        self.setup_system_tray()

    def center_window(self):
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = (screen_width - self.width) // 2
        y = (screen_height - self.height) // 2
        self.root.geometry(f"{self.width}x{self.height}+{x}+{y}")

    def create_titlebar(self):
        # Top title bar for dragging and closing
        self.titlebar = tk.Frame(self.root, bg=self.color_titlebar, height=30)
        self.titlebar.pack(fill="x", side="top")
        self.titlebar.pack_propagate(False)
        
        title_lbl = tk.Label(self.titlebar, text="🧮 CALC", bg=self.color_titlebar, fg="#94a3b8", font=self.title_font)
        title_lbl.pack(side="left", padx=10)
        
        # Close/Hide button (just hides window, does not exit app)
        close_btn = tk.Label(self.titlebar, text="✕", bg=self.color_titlebar, fg="#94a3b8", font=self.title_font, width=4)
        close_btn.pack(side="right", fill="y")
        close_btn.bind("<Button-1>", lambda e: self.hide_window())
        close_btn.bind("<Enter>", lambda e: close_btn.config(bg="#ef4444", fg="#ffffff"))
        close_btn.bind("<Leave>", lambda e: close_btn.config(bg=self.color_titlebar, fg="#94a3b8"))

        # Setup dragging
        self.titlebar.bind("<Button-1>", self.start_drag)
        self.titlebar.bind("<B1-Motion>", self.drag_motion)
        title_lbl.bind("<Button-1>", self.start_drag)
        title_lbl.bind("<B1-Motion>", self.drag_motion)

    def start_drag(self, event):
        self.x_offset = event.x
        self.y_offset = event.y

    def drag_motion(self, event):
        x = self.root.winfo_x() + event.x - self.x_offset
        y = self.root.winfo_y() + event.y - self.y_offset
        self.root.geometry(f"+{x}+{y}")

    def create_display(self):
        # Display Screen Container
        self.display_frame = tk.Frame(self.root, bg=self.color_bg, padx=10, pady=10)
        self.display_frame.pack(fill="x")
        
        self.display_val = tk.StringVar(value="0")
        self.display_lbl = tk.Label(
            self.display_frame,
            textvariable=self.display_val,
            bg=self.color_display_bg,
            fg=self.color_display_fg,
            font=self.display_font,
            anchor="e",
            padx=12,
            pady=15,
            bd=0
        )
        self.display_lbl.pack(fill="both", expand=True)

    def create_keypad(self):
        self.pad_frame = tk.Frame(self.root, bg=self.color_bg, padx=10, pady=10)
        self.pad_frame.pack(fill="both", expand=True)
        
        # Grid weight configuration
        for i in range(5):
            self.pad_frame.rowconfigure(i, weight=1, minsize=50)
        for j in range(4):
            self.pad_frame.columnconfigure(j, weight=1, minsize=60)
            
        # Keys definitions
        keys = [
            ("C", 0, 0, self.color_btn_action, self.color_btn_action_hover, "clear"),
            ("⌫", 0, 1, self.color_btn_action, self.color_btn_action_hover, "backspace"),
            ("÷", 0, 2, self.color_btn_op, self.color_btn_op_hover, "divide"),
            ("×", 0, 3, self.color_btn_op, self.color_btn_op_hover, "multiply"),
            
            ("7", 1, 0, self.color_btn_num, self.color_btn_num_hover, "7"),
            ("8", 1, 1, self.color_btn_num, self.color_btn_num_hover, "8"),
            ("9", 1, 2, self.color_btn_num, self.color_btn_num_hover, "9"),
            ("−", 1, 3, self.color_btn_op, self.color_btn_op_hover, "subtract"),
            
            ("4", 2, 0, self.color_btn_num, self.color_btn_num_hover, "4"),
            ("5", 2, 1, self.color_btn_num, self.color_btn_num_hover, "5"),
            ("6", 2, 2, self.color_btn_num, self.color_btn_num_hover, "6"),
            ("+", 2, 3, self.color_btn_op, self.color_btn_op_hover, "add"),
            
            ("1", 3, 0, self.color_btn_num, self.color_btn_num_hover, "1"),
            ("2", 3, 1, self.color_btn_num, self.color_btn_num_hover, "2"),
            ("3", 3, 2, self.color_btn_num, self.color_btn_num_hover, "3"),
            
            ("0", 4, 0, self.color_btn_num, self.color_btn_num_hover, "0"),
            (".", 4, 2, self.color_btn_num, self.color_btn_num_hover, "."),
            ("=", 3, 3, self.color_btn_equals, self.color_btn_equals_hover, "equals")
        ]
        
        for (text, r, c, bg, hbg, action) in keys:
            colspan = 2 if text == "0" else 1
            rowspan = 2 if text == "=" else 1
            
            btn = tk.Label(
                self.pad_frame,
                text=text,
                bg=bg,
                fg="#ffffff",
                font=self.btn_font,
                relief="flat",
                cursor="hand2"
            )
            btn.grid(row=r, column=c, columnspan=colspan, rowspan=rowspan, sticky="nsew", padx=4, pady=4)
            
            # Setup hover and click bindings
            btn.bind("<Enter>", lambda e, b=btn, h=hbg: b.config(bg=h))
            btn.bind("<Leave>", lambda e, b=btn, o=bg: b.config(bg=o))
            btn.bind("<Button-1>", lambda e, a=action: self.on_action(a))

    def on_action(self, action):
        if self.should_reset and action not in ["add", "subtract", "multiply", "divide", "equals"]:
            self.expression = ""
            self.should_reset = False
            
        if action in ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]:
            if self.expression == "0":
                self.expression = action
            else:
                self.expression += action
        elif action == ".":
            segments = self.expression.replace("+", " ").replace("-", " ").replace("*", " ").replace("/", " ").split()
            if not segments or not "." in segments[-1]:
                self.expression += "."
        elif action == "add":
            self.append_op("+")
        elif action == "subtract":
            self.append_op("-")
        elif action == "multiply":
            self.append_op("*")
        elif action == "divide":
            self.append_op("/")
        elif action == "clear":
            self.expression = ""
            self.should_reset = False
        elif action == "backspace":
            if self.should_reset:
                self.expression = ""
                self.should_reset = False
            else:
                self.expression = self.expression[:-1]
        elif action == "equals":
            self.evaluate()
            
        self.update_display()

    def append_op(self, op):
        if self.should_reset:
            self.should_reset = False
        if self.expression and self.expression[-1] in ["+", "-", "*", "/"]:
            self.expression = self.expression[:-1] + op
        elif self.expression:
            self.expression += op
        else:
            self.expression = "0" + op

    def evaluate(self):
        if not self.expression:
            return
        
        try:
            eval_target = self.expression
            if eval_target[-1] in ["+", "-", "*", "/"]:
                eval_target = eval_target[:-1]
                
            sanitised = eval_target.replace(" ", "")
            for char in sanitised:
                if char not in "0123456789.+-*/":
                    raise ValueError("Illegal character")
            
            result = eval(eval_target)
            
            if isinstance(result, float):
                formatted = f"{result:.8f}".rstrip("0").rstrip(".")
            else:
                formatted = str(result)
                
            self.expression = formatted
            self.should_reset = True
        except Exception:
            self.expression = "Error"
            self.should_reset = True

    def update_display(self):
        display_str = self.expression
        display_str = display_str.replace("/", "÷").replace("*", "×").replace("-", "−")
        if not display_str:
            display_str = "0"
        self.display_val.set(display_str)

    def on_key_press(self, event):
        char = event.char
        keysym = event.keysym
        
        if char in ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "."]:
            self.on_action(char)
        elif char == "+":
            self.on_action("add")
        elif char == "-":
            self.on_action("subtract")
        elif char == "*":
            self.on_action("multiply")
        elif char == "/":
            self.on_action("divide")
        elif keysym in ["Return", "equal"]:
            self.on_action("equals")
        elif keysym == "BackSpace":
            self.on_action("backspace")
        elif keysym in ["Escape", "c", "C"]:
            self.on_action("clear")

    def show_window(self):
        self.center_window()
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()

    def hide_window(self):
        self.root.withdraw()

    def on_focus_out(self, event):
        self.root.after(120, self.check_focus_loss)

    def check_focus_loss(self):
        focused = self.root.focus_get()
        if focused is None:
            self.hide_window()

    def create_tray_icon_image(self):
        # Synthesize a simple 64x64 calculator icon
        image = Image.new('RGB', (64, 64), color='#1e1e24')
        dc = ImageDraw.Draw(image)
        # Outer border
        dc.rectangle([8, 8, 56, 56], fill=None, outline='#6366f1', width=4)
        # Inner display bar
        dc.rectangle([14, 14, 50, 24], fill='#0f0f12')
        # Button representation grids
        for x in (18, 28, 38, 48):
            for y in (30, 38, 46):
                dc.rectangle([x-2, y-2, x+2, y+2], fill='#f1f1f5')
        return image

    def setup_system_tray(self):
        # Generate icon image
        self.tray_img = self.create_tray_icon_image()
        
        # Menu definitions
        self.tray_menu = pystray.Menu(
            item('Show Calculator', lambda: self.root.after(0, self.show_window), default=True),
            item('Exit', self.exit_application)
        )
        
        self.tray_icon = pystray.Icon(
            "Antigravity Calc",
            self.tray_img,
            "Antigravity Popup Calculator",
            self.tray_menu
        )
        # Start the tray icon in a separate background thread
        self.tray_icon.run_detached()

    def exit_application(self):
        # Stop tray icon loop
        self.tray_icon.stop()
        # Destroy main Tkinter thread
        self.root.after(0, self.root.destroy)

if __name__ == "__main__":
    root = tk.Tk()
    app = PopupCalculator(root)
    
    # Hide window on initial startup (runs silently in the system tray)
    app.hide_window()
    
    # Start Tkinter main loop
    root.mainloop()
