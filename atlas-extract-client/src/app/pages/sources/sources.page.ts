import { Component, inject, OnInit } from "@angular/core";
import { AsyncPipe, JsonPipe } from "@angular/common";
import { AppContainer } from "../../components/app-container/app-container.component";
import { Card } from "../../ncss/cards/card/card.component";
import { SourcesService } from "../../services/sources.service";
import { Subscription } from "rxjs";



@Component({
  selector: 'app-sources',
  templateUrl: './sources.page.html',
  styleUrls: ['./sources.page.css'],
  standalone: true,
  imports: [AppContainer, Card, AsyncPipe, JsonPipe]
})



export class SourcesPage implements OnInit {
    private sourcesService = inject(SourcesService);
    public sources$ = this.sourcesService.sources$;


    ngOnInit(): void {
        this.sourcesService.getSources();
    }

}
