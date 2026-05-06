/**
 * @module @architext/cli/status
 * Concepts: [[StatusBar]], [[ANSI]], [[InPlaceRender]]
 * Spec: §5.5 Output / progress UX
 * Depends on: none (pure rendering)
 * Consumed by: [[commands/apply]]
 */

export interface StatusBarOptions {
  write: (s: string) => void;
  now?: () => number;
}

export interface StatusBarStartOpts {
  project: string;
  agent: string;
}

export interface StatusBarUpdateOpts {
  filesWritten: number;
  elapsedMs: number;
}

const ANSI_CLEAR = "\x1b[2K\r";

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return `${min}m${sec.toString().padStart(2, "0")}s`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m.toString().padStart(2, "0")}m${sec.toString().padStart(2, "0")}s`;
}

export class StatusBar {
  private project = "";
  private agent = "";
  private active = false;

  constructor(private readonly opts: StatusBarOptions) {}

  start(s: StatusBarStartOpts): void {
    this.project = s.project;
    this.agent = s.agent;
    this.active = true;
    this.opts.write(this.render(0, 0));
  }

  update(u: StatusBarUpdateOpts): void {
    if (!this.active) return;
    this.opts.write(ANSI_CLEAR);
    this.opts.write(this.render(u.filesWritten, u.elapsedMs));
  }

  stop(): void {
    if (!this.active) return;
    this.opts.write(ANSI_CLEAR);
    this.active = false;
  }

  private render(filesWritten: number, elapsedMs: number): string {
    const elapsed = formatElapsed(elapsedMs);
    return `Architext · ${this.project} · ${this.agent} · ${filesWritten} files written · ${elapsed}`;
  }
}
