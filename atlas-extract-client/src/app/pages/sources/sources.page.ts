import { Component, inject, OnInit, AfterViewInit, ViewChild, TemplateRef } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { AppContainer } from "../../components/app-container/app-container.component";
import { Card } from "../../ncss/cards/card/card.component";
import { SourcesService } from "../../services/sources.service";
import { Table } from "../../ncss/tables/table/table";
import { Button } from "../../ncss/buttons/button/button.component";
import { PlusIcon } from "../../ncss/icons";
import { RouterLink } from "@angular/router";
import { Modal } from "../../ncss/popups/modal/modal.component";
import { FormsModule } from "@angular/forms";
import { Source } from "../../types/Source";
import { FormService } from "../../ncss/services/form.service";
import { ToastService } from "../../ncss/services/toast.service";



@Component({
  selector: 'app-sources',
  templateUrl: './sources.page.html',
  styleUrls: ['./sources.page.css'],
  standalone: true,
  imports: [AppContainer, Card, AsyncPipe, Table, Button, PlusIcon, RouterLink, Modal, FormsModule]
})



export class SourcesPage implements OnInit, AfterViewInit {
    private toastService = inject(ToastService);
    private formService = inject(FormService);
    private sourcesService = inject(SourcesService);
    public sources$ = this.sourcesService.sources$;
    public columnsConfig: any[] = [];

    public sourceToEdit: Source | null = null;
    public editFormSubmitting = false;
    public editFormId: string = 'edit-source-form';
    public sourceType: string = "pdf"; // app only does pdf for now

    @ViewChild('dateTemplate') dateTemplate!: TemplateRef<any>;
    @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;
    @ViewChild('updateSourceModal') updateSourceModal!: Modal;

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
            {column: 'createdAt', displayValue: 'Created At' , width: '200px'},
            {column: 'actions', displayValue: 'Actions', width: '170px', template: this.actionsTemplate}
        ];
    }

    openUpdateSourceModal(row: Source): void {
        this.sourceToEdit = row;
        this.updateSourceModal.openModal()
    }

    onUpdateSourceModalClose(): void {
        console.log(this.sourceToEdit);
        this.sourceToEdit = null;
    }

    checkEditFormValidity(formValues: { [key: string]: any }): boolean {
        let isValid = true;
        const errors = [];
        if (
            !formValues['friendlyName'] || 
            typeof formValues['friendlyName'] !== 'string' || 
            formValues['friendlyName'].trim() === ''
        ) {
            errors.push('Friendly Name is required and must be a non-empty string.');
            isValid = false;
        }
        if (errors.length > 0) this.toastService.error({ text: errors.join(' and ') });
        return isValid;

    }

    onSourceEdit(): void {
        const formValues = this.formService.getFormValues(this.editFormId);
        if (!this.checkEditFormValidity(formValues)) return;
        this.editFormSubmitting = true;
        this.sourcesService.updateSource(this.sourceToEdit!.id, formValues);
        this.editFormSubmitting = false;
        this.sourceToEdit = null;
    }

    deleteSource(id: string): void {
        if (confirm('Are you sure you want to delete this source?')) {
            this.sourcesService.deleteSource(id);
        }
    }

    public onTypeChange(event: Event): void {
        const selectElement = event.target as HTMLSelectElement;
        const selectedType = selectElement.value;
        this.sourceType = selectedType;
    }

}
