import {
  AfterContentInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  SimpleChanges,
  EventEmitter
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { map, switchMap } from 'rxjs/operators';

/**
 * You may include a different variant of BpmnJS:
 *
 * bpmn-viewer  - displays BPMN diagrams without the ability
 *                to navigate them
 * bpmn-modeler - bootstraps a full-fledged BPMN editor
 */
import * as BpmnJS from 'bpmn-js/dist/bpmn-modeler.production.min.js';
import * as BpmnViewer from 'bpmn-js/dist/bpmn-viewer.production.min.js';

import { from, Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-diagram',
  template: `
    <div #ref class="diagram-container"></div>
  `,
  styles: [
    `
      .diagram-container {
        height: 100%;
        width: 100%;
      }
    `
  ]
})
export class DiagramComponent implements AfterContentInit, OnChanges, OnDestroy {
  private bpmnJS: BpmnViewer;

  private canvas;

  @ViewChild('ref', { static: true }) private el: ElementRef;
  @Output() private importDone: EventEmitter<any> = new EventEmitter();

  @Input() private url: string;

  constructor(private http: HttpClient) {

    this.bpmnJS = new BpmnViewer();

    this.bpmnJS.on('import.done', ({ error }) => {
      if (!error) {
        console.log('Import done');
        this.canvas = this.bpmnJS.get('canvas');
        console.log('Canvas');
        console.log(this.canvas.getRootElement());
        
        this.bpmnJS.get('canvas').zoom('fit-viewport');
        //this.bpmnJS.get('canvas').addMarker('ENTRY_STATE_VALIDATION', 'needs-discussion');
        this.bpmnJS.get('canvas').addMarker('ENTRY_STATE_VALIDATION', 'done');
        this.bpmnJS.get('canvas').addMarker('TRANSACTION_LOG_1', 'done');
        this.bpmnJS.get('canvas').addMarker('TRANS_AUTH', 'done');
        this.bpmnJS.get('canvas').addMarker('Gateway_IS_TRANS_AUTH_SUCCESS', 'done');
        this.bpmnJS.get('canvas').addMarker('TRANS_PROC', 'inProgress');
        this.bpmnJS.get('canvas').addMarker('TRANSACTION_LOG_2', 'notTraversed');
        this.bpmnJS.get('canvas').addMarker('Event_0t546gq', 'notTraversed');
        
      }
    });
  }

  ngAfterContentInit(): void {
    this.bpmnJS.attachTo(this.el.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges) {
    // re-import whenever the url changes
    if (changes.url) {
      this.loadUrl(changes.url.currentValue);
    }
  }

  ngOnDestroy(): void {
    this.bpmnJS.destroy();
  }

  /**
   * Load diagram from URL and emit completion event
   */
  loadUrl(url: string): Subscription {

    return (
      this.http.get(url, { responseType: 'text' }).pipe(
        switchMap((xml: string) => this.importDiagram(xml)),
        map(result => result.warnings),
      ).subscribe(
        (warnings) => {
          this.importDone.emit({
            type: 'success',
            warnings
          });
        },
        (err) => {
          this.importDone.emit({
            type: 'error',
            error: err
          });
        }
      )
    );
  }

  /**
   * Creates a Promise to import the given XML into the current
   * BpmnJS instance, then returns it as an Observable.
   *
   * @see https://github.com/bpmn-io/bpmn-js-callbacks-to-promises#importxml
   */
  private importDiagram(xml: string): Observable<{warnings: Array<any>}> {
    return from(this.bpmnJS.importXML(xml) as Promise<{warnings: Array<any>}>);
  }
}
