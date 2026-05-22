import { Component, inject, OnInit, AfterViewInit, ViewChild, TemplateRef } from "@angular/core";
import { AsyncPipe, DatePipe } from "@angular/common";
import { AppContainer } from "../../components/app-container/app-container.component";
import { Card } from "../../ncss/cards/card/card.component";
import { SourcesService } from "../../services/sources.service";
import { Table } from "../../ncss/tables/table/table";
import { Button } from "../../ncss/buttons/button/button.component";
import { PlusIcon } from "../../ncss/icons";
import { RouterLink } from "@angular/router";



@Component({
  selector: 'app-sources',
  templateUrl: './sources.page.html',
  styleUrls: ['./sources.page.css'],
  standalone: true,
  imports: [AppContainer, Card, AsyncPipe, Table, DatePipe, Button, PlusIcon, RouterLink]
})



export class SourcesPage implements OnInit, AfterViewInit {
    private sourcesService = inject(SourcesService);
    public sources$ = this.sourcesService.sources$;
    public columnsConfig: any[] = [];

    @ViewChild('dateTemplate') dateTemplate!: TemplateRef<any>;

    ngOnInit(): void {
        this.sourcesService.getSources();
    }

    ngAfterViewInit(): void {
        this.columnsConfig = [
            {column: 'friendlyName', displayValue: 'Friendly Name', width: '200px'},
            {column: 'title', displayValue: 'Source Title', width: '250px'},
            {column: 'author', displayValue: 'Author', width: '200px'},
            {column: 'type', displayValue: 'Type', width: '100px'},
            {column: 'createdBy', displayValue: 'Created By', width: '150px'},
            {column: 'createdAt', displayValue: 'Created At' , width: '200px'}
        ];
    }

}
