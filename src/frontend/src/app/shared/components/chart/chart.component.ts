import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Chart, type ChartConfiguration } from 'chart.js';
import {
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  BarController,
  LineController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

Chart.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  BarController,
  LineController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000';
}

@Component({
  selector: 'app-chart',
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }
    canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() config!: ChartConfiguration;

  private chart?: Chart;
  private pendingConfig?: ChartConfiguration;

  ngAfterViewInit(): void {
    if (this.pendingConfig) {
      this.createChart(this.pendingConfig);
      this.pendingConfig = undefined;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.config) {
      if (this.chart) {
        this.chart.destroy();
        this.chart = undefined;
      }
      if (this.canvasRef?.nativeElement) {
        this.createChart(this.config);
      } else {
        this.pendingConfig = this.config;
      }
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = undefined;
  }

  private createChart(config: ChartConfiguration): void {
    if (!this.canvasRef?.nativeElement) return;

    const textPrimary = getCssVar('--text-primary');
    const textMuted = getCssVar('--text-muted');
    const borderColor = getCssVar('--border-color');
    const surfaceBg = getCssVar('--surface-bg');

    const themedConfig: ChartConfiguration = {
      ...config,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...config.options,
        plugins: {
          legend: {
            labels: {
              color: textPrimary,
              font: { size: 12, family: 'inherit' },
              padding: 16,
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: surfaceBg,
            titleColor: textPrimary,
            bodyColor: textPrimary,
            borderColor: borderColor,
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            displayColors: true,
            ...config.options?.plugins?.tooltip,
          },
          ...config.options?.plugins,
        },
        scales: config.options?.scales
          ? Object.fromEntries(
              Object.entries(config.options.scales).map(([key, scale]) => [
                key,
                {
                  ...scale,
                  grid: {
                    color: borderColor + '40',
                    ...((scale as any)?.grid ?? {}),
                  },
                  ticks: {
                    color: textMuted,
                    font: { size: 11, family: 'inherit' },
                    ...((scale as any)?.ticks ?? {}),
                  },
                  border: {
                    color: borderColor,
                    ...((scale as any)?.border ?? {}),
                  },
                },
              ])
            )
          : undefined,
      },
    };

    try {
      this.chart = new Chart(this.canvasRef.nativeElement, themedConfig);
    } catch (err) {
      console.error('[ChartComponent] Failed to create chart:', err);
    }
  }
}
