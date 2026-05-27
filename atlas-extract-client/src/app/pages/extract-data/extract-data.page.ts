import { Component, inject, OnInit } from '@angular/core';
import { Card } from "../../ncss/cards/card/card.component";
import { AppContainer } from "../../components/app-container/app-container.component";
import { SourcesService } from '../../services/sources.service';
import { AsyncPipe } from '@angular/common';

import { RouterLink } from '@angular/router';
import { Button } from "../../ncss/buttons/button/button.component";



@Component({
  selector: 'app-extracted-data',
  imports: [Card, AppContainer, AsyncPipe, RouterLink, Button],
  templateUrl: './extract-data.page.html',
  styleUrl: './extract-data.page.css',
})



export class ExtractDataPage implements OnInit {
  private sourcesService = inject(SourcesService);
  public sources$ = this.sourcesService.sources$;

  ngOnInit(): void {
    this.sourcesService.getSources();
  }

}
