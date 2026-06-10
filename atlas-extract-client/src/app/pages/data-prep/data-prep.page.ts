import { Component, inject, OnInit } from "@angular/core";
import { AsyncPipe, DatePipe } from "@angular/common";
import { map } from "rxjs";
import { ExtractionService } from "../../services/extraction.service";
import { PageRange } from "../../types/Extraction";
import { AppContainer } from "../../components/app-container/app-container.component";
import { Card } from "../../ncss/cards/card/card.component";
import { Button } from "../../ncss/buttons/button/button.component";
import { RouterLink } from "@angular/router";



@Component({
  selector: "app-data-prep",
  templateUrl: "./data-prep.page.html",
  styleUrl: "./data-prep.page.css",
  imports: [AppContainer, Card, Button, AsyncPipe, DatePipe, RouterLink]
})
export class DataPrepPage implements OnInit {
    private readonly extractionService = inject(ExtractionService);
    public readonly extractionList$ = this.extractionService.extractionList$.pipe(
        map(extractions => extractions?.filter(e => e.status === 'completed') ?? null)
    );

    ngOnInit(): void {
        this.extractionService.getExtractionList();
    }

    protected formatPageRanges(pages: PageRange[]): string {
        return pages
            .map(p => p.startPage === p.endPage ? `${p.startPage}` : `${p.startPage}-${p.endPage}`)
            .join(', ');
    }
}