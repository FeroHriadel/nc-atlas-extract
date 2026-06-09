import { Component, inject, OnInit, AfterViewInit, ViewChild, TemplateRef } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { AppContainer } from "../../components/app-container/app-container.component";
import { Card } from "../../ncss/cards/card/card.component";
import { Table, TableProps } from "../../ncss/tables/table/table";
import { Button } from "../../ncss/buttons/button/button.component";
import { PlusIcon } from "../../ncss/icons";
import { Modal } from "../../ncss/popups/modal/modal.component";
import { FormsModule } from "@angular/forms";
import { SourcesService } from "../../services/sources.service";
import { FormService } from "../../ncss/services/form.service";
import { ToastService } from "../../ncss/services/toast.service";
import { Source } from "../../types/Source";



@Component({
  selector: 'app-sources',
  templateUrl: './sources.page.html',
  styleUrl: './sources.page.css',
  imports: [AppContainer, Card, AsyncPipe, Table, Button, PlusIcon, RouterLink, Modal, FormsModule]
})
export class SourcesPage implements OnInit, AfterViewInit {
    private readonly toastService = inject(ToastService);
    private readonly formService = inject(FormService);
    private readonly sourcesService = inject(SourcesService);

    @ViewChild('actionsTemplate') private actionsTemplate!: TemplateRef<any>;
    @ViewChild('updateSourceModal') protected updateSourceModal!: Modal;

    protected sources$ = this.sourcesService.sources$;
    protected columnsConfig: TableProps['columnsConfig'] = [];
    protected sourceToEdit: Source | null = null;
    protected editFormSubmitting = false;
    protected sourceType = 'pdf';
    protected readonly editFormId = 'edit-source-form';

    ngOnInit(): void {
        this.sourcesService.getSources();
    }

    ngAfterViewInit(): void {
        this.columnsConfig = [
            { column: 'friendlyName', displayValue: 'Friendly Name', width: '200px' },
            { column: 'title',        displayValue: 'Source Title',   width: '250px' },
            { column: 'author',       displayValue: 'Author',         width: '200px' },
            { column: 'type',         displayValue: 'Type',           width: '100px' },
            { column: 'createdBy',    displayValue: 'Created By',     width: '150px' },
            { column: 'createdAt',    displayValue: 'Created At',     width: '200px' },
            { column: 'actions',      displayValue: 'Actions',        width: '170px', template: this.actionsTemplate },
        ];
    }

    protected openUpdateSourceModal(row: Source): void {
        this.sourceToEdit = row;
        this.updateSourceModal.openModal();
    }

    protected onUpdateSourceModalClose(): void {
        this.sourceToEdit = null;
    }

    protected async onSourceEdit(): Promise<void> {
        const formValues = this.formService.getFormValues(this.editFormId);
        if (!this.checkEditFormValidity(formValues)) return;
        this.editFormSubmitting = true;
        try {
            await this.sourcesService.updateSource(this.sourceToEdit!.id, formValues);
            this.sourceToEdit = null;
        } catch {
            // error toast already shown by service
        } finally {
            this.editFormSubmitting = false;
        }
    }

    protected deleteSource(id: string): void {
        if (confirm('Are you sure you want to delete this source?')) {
            this.sourcesService.deleteSource(id);
        }
    }

    protected onTypeChange(event: Event): void {
        this.sourceType = (event.target as HTMLSelectElement).value;
    }

    private checkEditFormValidity(formValues: { [key: string]: any }): boolean {
        const name = formValues['friendlyName'];
        if (!name || typeof name !== 'string' || name.trim() === '') {
            this.toastService.error({ text: 'Friendly Name is required and must be a non-empty string.' });
            return false;
        }
        return true;
    }
}
