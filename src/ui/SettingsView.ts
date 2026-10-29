import type { FrequencyFocus, VisualSettings } from "../domain/settings";
import type { VisualMode } from "../domain/models";
import type { VisualSettingKey } from "../visual/settingEffects";

const modes: readonly { value: VisualMode; label: string }[] = [
  { value: "waveform", label: "Waveform" },
  { value: "spectrum", label: "Spectrum" },
  { value: "radial", label: "Radial" },
  { value: "particle", label: "Particle" },
  { value: "psychedelic", label: "Psychedelic" },
];

const presets = ["monochrome", "ambient", "neon", "psychedelic"] as const;

export interface SettingsViewActions {
  readonly onModeChange: (mode: VisualMode) => void;
  readonly onSettingChange: (key: VisualSettingKey, value: number | FrequencyFocus) => void;
  readonly onPresetApply: (presetId: (typeof presets)[number]) => void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Accessible, semantic controls for visual mode and user-adjustable settings. */
export class SettingsView {
  private readonly modeSelect = element("select", "setting-select");
  private readonly focusSelect = element("select", "setting-select");
  private readonly presetSelect = element("select", "setting-select");
  private readonly motionPreferenceNote = element(
    "p",
    "motion-preference-note",
    "Reduced motion is active on this device. Visuals still respond to the audio.",
  );
  private readonly sliders = new Map<Exclude<VisualSettingKey, "frequencyFocus">, HTMLInputElement>();
  private readonly outputs = new Map<Exclude<VisualSettingKey, "frequencyFocus">, HTMLOutputElement>();

  constructor(
    private readonly host: HTMLElement,
    private readonly actions: SettingsViewActions,
  ) {}

  mount(): void {
    const section = element("section", "visual-settings");
    section.setAttribute("aria-labelledby", "visual-settings-title");
    this.motionPreferenceNote.hidden = true;
    this.motionPreferenceNote.setAttribute("role", "status");
    const title = element("h3", "subsection-title", "Visual controls");
    title.id = "visual-settings-title";

    for (const mode of modes) {
      const option = element("option", undefined, mode.label);
      option.value = mode.value;
      this.modeSelect.append(option);
    }
    this.modeSelect.setAttribute("aria-label", "Visual mode");
    this.modeSelect.addEventListener("change", () => {
      const selected = modes.find(({ value }) => value === this.modeSelect.value);
      if (selected) this.actions.onModeChange(selected.value);
    });
    const modeLabel = element("label", "setting-label", "Mode");
    modeLabel.append(this.modeSelect);

    for (const focus of ["bass", "mid", "treble", "balanced"] as const) {
      const option = element("option", undefined, focus[0]!.toUpperCase() + focus.slice(1));
      option.value = focus;
      this.focusSelect.append(option);
    }
    this.focusSelect.setAttribute("aria-label", "Frequency focus");
    this.focusSelect.addEventListener("change", () => {
      this.actions.onSettingChange("frequencyFocus", this.focusSelect.value as FrequencyFocus);
    });
    const focusLabel = element("label", "setting-label", "Frequency focus");
    focusLabel.append(this.focusSelect);

    const presetGroup = element("div", "preset-controls");
    const customOption = element("option", undefined, "Current settings");
    customOption.value = "custom";
    this.presetSelect.append(customOption);
    for (const preset of presets) {
      const option = element("option", undefined, preset[0]!.toUpperCase() + preset.slice(1));
      option.value = preset;
      this.presetSelect.append(option);
    }
    this.presetSelect.setAttribute("aria-label", "Visual preset");
    const apply = element("button", "preset-apply", "Apply preset");
    apply.type = "button";
    apply.addEventListener("click", () => {
      this.actions.onPresetApply(this.presetSelect.value as (typeof presets)[number]);
    });
    presetGroup.append(this.presetSelect, apply);
    const presetLabel = element("label", "setting-label", "Palette preset");
    presetLabel.append(presetGroup);

    const controls = element("div", "visual-setting-grid");
    controls.append(
      this.createSlider("sensitivity", "Sensitivity"),
      focusLabel,
      this.createSlider("colorIntensity", "Color intensity"),
      this.createSlider("motion", "Motion"),
      this.createSlider("effectIntensity", "Effect intensity"),
    );
    section.append(title, modeLabel, presetLabel, controls, this.motionPreferenceNote);
    this.host.replaceChildren(section);
    this.render("waveform", {
      sensitivity: 50,
      frequencyFocus: "balanced",
      colorIntensity: 60,
      motion: 35,
      effectIntensity: 45,
      selectedPresetId: "custom",
    });
  }

  render(mode: VisualMode, settings: VisualSettings): void {
    this.modeSelect.value = mode;
    this.focusSelect.value = settings.frequencyFocus;
    this.presetSelect.value = settings.selectedPresetId;
    const values = {
      sensitivity: settings.sensitivity,
      colorIntensity: settings.colorIntensity,
      motion: settings.motion,
      effectIntensity: settings.effectIntensity,
    } as const;
    for (const [key, value] of Object.entries(values) as Array<[keyof typeof values, number]>) {
      const input = this.sliders.get(key);
      const output = this.outputs.get(key);
      if (input) input.value = String(value);
      if (output) output.value = String(value);
      if (input) input.setAttribute("aria-valuetext", `${value}%`);
    }
  }

  setReducedMotionPreference(isActive: boolean): void {
    this.motionPreferenceNote.hidden = !isActive;
  }

  private createSlider(
    key: Exclude<VisualSettingKey, "frequencyFocus">,
    labelText: string,
  ): HTMLLabelElement {
    const label = element("label", "setting-label", labelText);
    const input = element("input", "setting-slider");
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.step = "1";
    input.setAttribute("aria-label", labelText);
    input.id = `visual-setting-${key}`;
    const output = element("output", "setting-value", "0");
    output.htmlFor = input.id;
    input.addEventListener("input", () => {
      output.value = input.value;
      input.setAttribute("aria-valuetext", `${input.value}%`);
      this.actions.onSettingChange(key, Number(input.value));
    });
    label.append(input, output);
    this.sliders.set(key, input);
    this.outputs.set(key, output);
    return label;
  }
}
