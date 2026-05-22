import { Component, inject, OnInit } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { AppContainer } from "../../components/app-container/app-container.component";
import { Card } from "../../ncss/cards/card/card.component";
import { SourcesService } from "../../services/sources.service";



@Component({
  selector: 'app-sources',
  templateUrl: './sources.page.html',
  styleUrls: ['./sources.page.css'],
  standalone: true,
  imports: [AppContainer, Card, AsyncPipe]
})



export class SourcesPage implements OnInit {
    private sourcesService = inject(SourcesService);
    sources$ = this.sourcesService.sources$;

    ngOnInit(): void {
        this.sourcesService.getSources();
    }
}
