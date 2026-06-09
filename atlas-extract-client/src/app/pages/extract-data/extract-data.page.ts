import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Card } from "../../ncss/cards/card/card.component";
import { AppContainer } from "../../components/app-container/app-container.component";
import { Button } from "../../ncss/buttons/button/button.component";
import { SourcesService } from '../../services/sources.service';



@Component({
  selector: 'app-extract-data',
  imports: [Card, AppContainer, AsyncPipe, RouterLink, Button],
  templateUrl: './extract-data.page.html',
  styleUrl: './extract-data.page.css',
})
export class ExtractDataPage implements OnInit {
  private readonly sourcesService = inject(SourcesService);
  protected sources$ = this.sourcesService.sources$;

  ngOnInit(): void {
    this.sourcesService.getSources();
  }

  protected async onDeleteSource(id: string): Promise<void> {
    if (!confirm('Delete this source? This cannot be undone.')) return;
    try {
      await this.sourcesService.deleteSource(id);
    } catch {
      // service handles rollback and error toast
    }
  }
}
