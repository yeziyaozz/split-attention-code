var jsPsychPluginWheel = (function(jspsych) {
  "use strict";

  const info = {
    name: "plugin-wheel",
    version: "0.0.1",
    parameters: {
      spinSpeed:        { type: jspsych.ParameterType.INT,   default: 6 },
      cooldownDuration: { type: jspsych.ParameterType.INT,   default: 2000 },
      blinkDuration:    { type: jspsych.ParameterType.INT,   default: 200 },
      blinkPauseMin:    { type: jspsych.ParameterType.INT,   default: 400 },
      blinkPauseMax:    { type: jspsych.ParameterType.INT,   default: 2000 },
      isDot:            { type: jspsych.ParameterType.BOOL,  default: false }
    }
  };

  class WheelPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      // ─── 1) Inject CSS once ─────────────────────────────────────────────
      if (!WheelPlugin.cssAdded) {
        const style = document.createElement("style");
        style.innerHTML = `
          #circle { width:300px; height:300px; border-radius:50%; background:gray; position:relative; margin:100px auto; }
          #circle.cooldown { background:rgb(186,186,186); }
          #target-line { width:4px; height:150px; background:black; position:absolute; top:0; left:calc(50% - 2px); transform-origin:center bottom; z-index:1; }
          #target-line-dot { width:4px; height:4px; background:black; border-radius:50%; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:1; }
          #fixed-line { width:2px; height:150px; background:black; position:absolute; top:0; left:calc(50% - 1px); transform-origin:bottom; z-index:0; }
          #fixed-line.cooldown { background:gray; }
          #red-dot { width:20px; height:20; background:red; border-radius:50%; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:2; }
        `;
        document.head.appendChild(style);
        WheelPlugin.cssAdded = true;
      }

      // ─── 2) Inject HTML ─────────────────────────────────────────────────
      display_element.innerHTML = `
        <div id="circle" class="cooldown">
          <div id="target-line"></div>
          <div id="target-line-dot"></div>
          <div id="fixed-line"></div>
          <div id="red-dot"></div>
        </div>`;

      // ─── 3) State vars & helpers ────────────────────────────────────────
      let blinkCount = 0;
      let angle      = 0;
      let spinning   = true;
      let isCooldown = false;
      let spinCount  = 0;

      // track timeouts so we can clear them all on end
      const timeouts = [];
      function schedule(fn, delay) {
        const id = setTimeout(fn, delay);
        timeouts.push(id);
        return id;
      }

      // grab elements
      const circle     = document.getElementById("circle");
      const targetLine = document.getElementById("target-line");
      const redDot     = document.getElementById("red-dot");
      const dotOnLine  = document.getElementById("target-line-dot");
      const fixedLine  = document.getElementById("fixed-line");

      // hide dot if needed
      if (!trial.isDot) redDot.style.visibility = "hidden";

      // cooldown helper
      function cooldown() {
        isCooldown = true;
        circle.classList.add("cooldown");
        schedule(() => {
          circle.classList.remove("cooldown");
          isCooldown = false;
        }, trial.cooldownDuration);
      }

      // spin loop
      function spin() {
        if (spinning) {
          angle = (angle + trial.spinSpeed) % 360;
          targetLine.style.transform = `rotate(${angle}deg)`;
        }
        requestAnimationFrame(spin);
      }

      // blink loop
      function blinkRedDot() {
        redDot.style.visibility = "visible";
        blinkCount++;
        schedule(() => {
          redDot.style.visibility = "hidden";
          const pause = Math.random() * (trial.blinkPauseMax - trial.blinkPauseMin)
                        + trial.blinkPauseMin;
          schedule(blinkRedDot, pause);
        }, trial.blinkDuration);
      }

      // sequence controller
      const startSpinSequence = () => {
        if (spinCount < 3) {
          if (spinCount > 0) cooldown();
          spinning = true;
        } else {
          // cleanup before finishing
          timeouts.forEach(clearTimeout);
          document.removeEventListener("keydown", keyListener);
          display_element.innerHTML = "";
          this.jsPsych.finishTrial({ blinkCount, angle, spinSpeed: trial.spinSpeed });
        }
      };

      // ignore stray Space for first 500ms
      let allowStop = false;
      schedule(() => allowStop = true, 500);

      // key handler (registered per trial)
      const keyListener = (e) => {
        if (e.code === "Space" && allowStop && !isCooldown && spinning) {
          spinning = false;
          schedule(() => {
            spinCount++;
            startSpinSequence();
          }, 500);
        }
      };
      document.addEventListener("keydown", keyListener);

      // ─── 4) Launch ────────────────────────────────────────────────────────
      startSpinSequence();
      spin();
      if (trial.isDot) blinkRedDot();
    }
  }

  WheelPlugin.info     = info;
  WheelPlugin.cssAdded = false;
  return WheelPlugin;
})(jsPsychModule);