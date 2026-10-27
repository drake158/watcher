function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className !== undefined) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

export class AppView {
  constructor(private readonly root: HTMLElement) {}

  mount(): void {
    const main = createElement("main", "watcher-shell");
    main.append(
      this.createHeader(),
      this.createWorkspace(),
      this.createFooter(),
    );
    this.root.replaceChildren(main);
  }

  private createHeader(): HTMLElement {
    const header = createElement("header", "masthead");
    const brand = createElement("div", "brand-lockup");
    const eyebrow = createElement("p", "eyebrow", "LOCAL AUDIO / VISUAL SYSTEM");
    const title = createElement("h1", "brand-title", "WATCHER");
    const subtitle = createElement(
      "p",
      "brand-subtitle",
      "A browser-based listening room",
    );
    brand.append(eyebrow, title, subtitle);

    const status = createElement("span", "system-status");
    status.append(createElement("span", "status-light"));
    status.append(document.createTextNode("SYSTEM READY"));
    header.append(brand, status);
    return header;
  }

  private createWorkspace(): HTMLElement {
    const workspace = createElement("div", "workspace");
    workspace.append(this.createVisualizerPanel(), this.createPlayerPanel());
    return workspace;
  }

  private createVisualizerPanel(): HTMLElement {
    const section = createElement("section", "panel visualizer-panel");
    section.setAttribute("aria-labelledby", "visualizer-title");

    const heading = createElement("div", "panel-heading");
    const headingText = createElement("div");
    const title = createElement("h2", "panel-title", "Visualizer");
    title.id = "visualizer-title";
    headingText.append(
      createElement("p", "eyebrow", "SIGNAL WINDOW 01"),
      title,
    );
    heading.append(
      headingText,
      createElement("span", "standby-badge", "STANDBY"),
    );

    const screen = createElement("div", "visualizer-screen");
    const canvas = createElement("canvas", "visualizer-canvas");
    canvas.id = "visualizer-canvas";
    canvas.setAttribute("aria-hidden", "true");
    screen.append(canvas);
    const prompt = createElement("div", "screen-prompt");
    prompt.setAttribute("aria-hidden", "true");
    prompt.append(
      createElement("span", "prompt-symbol", "✳"),
      createElement("p", "prompt-title", "AWAITING LOCAL AUDIO"),
      createElement("p", "prompt-caption", "SIGNAL OUTPUT WILL APPEAR HERE"),
    );
    screen.append(prompt);
    section.append(heading, screen);
    return section;
  }

  private createPlayerPanel(): HTMLElement {
    const section = createElement("section", "panel player-panel");
    section.setAttribute("aria-labelledby", "player-title");

    const heading = createElement("div", "panel-heading");
    const title = createElement("h2", "panel-title", "Playback deck");
    title.id = "player-title";
    const counter = createElement("span", "deck-counter", "TRACK 00 / 00");
    counter.id = "track-counter";
    heading.append(
      title,
      counter,
    );

    const emptyState = createElement("div", "empty-state");
    emptyState.id = "empty-state";
    emptyState.append(
      createElement("span", "empty-state-mark", "◌"),
      createElement("h3", "empty-state-title", "No track loaded"),
      createElement(
        "p",
        "empty-state-copy",
        "Choose local audio to start a listening session. Your files stay on this device.",
      ),
    );

    const liveStatus = createElement("p", "live-status", "Player is idle.");
    liveStatus.id = "playback-status";
    liveStatus.setAttribute("role", "status");
    liveStatus.setAttribute("aria-live", "polite");
    liveStatus.setAttribute("aria-atomic", "true");

    const trackListSlot = createElement("div", "track-list-slot");
    trackListSlot.id = "track-list-slot";

    const controlsSlot = createElement("div", "control-deck");
    controlsSlot.id = "player-controls-slot";
    controlsSlot.setAttribute("aria-labelledby", "player-title");
    controlsSlot.append(
      createElement(
        "p",
        "controls-hint",
        "Playback controls will be available after a track is loaded.",
      ),
    );

    section.append(heading, emptyState, trackListSlot, liveStatus, controlsSlot);
    return section;
  }

  private createFooter(): HTMLElement {
    const footer = createElement("footer", "status-footer");
    footer.append(
      createElement("span", undefined, "ALL AUDIO IS PROCESSED LOCALLY"),
      createElement("span", undefined, "NO ACCOUNT · NO UPLOAD · JUST PLAY"),
    );
    return footer;
  }
}
