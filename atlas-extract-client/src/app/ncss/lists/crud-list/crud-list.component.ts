import { Component, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SquareButton } from '../../buttons/square-button/square-button.component';
import { Card } from '../../cards/card/card.component';
import { PlusIcon } from '../../icons/plus.icon';
import { EditIcon } from '../../icons/edit.icon';
import { DeleteIcon } from '../../icons/delete.icon';



export interface CrudListItem {
    text: string;
    template?: TemplateRef<any>;  // Optional custom template for this item
    data?: any;
    onClick?: () => void;
}



@Component({
  selector: 'nc-crud-list',
  standalone: true,
  templateUrl: './crud-list.component.html',
  styleUrls: ['./crud-list.component.css'],
  imports: [SquareButton, Card, PlusIcon, EditIcon, DeleteIcon, CommonModule]
})



export class CrudList {
  @Input() title: string = 'Item List';
  @Input() items: CrudListItem[] = [];
  @Input() striped?: boolean = true;
  @Input() noItemsText?: string = 'No items found';
  @Input() onCreate: () => void = () => {};
  @Input() onClick: (item: CrudListItem) => void = () => {};
  @Input() onUpdate: (item: CrudListItem) => void = () => {};
  @Input() onDelete: (item: CrudListItem) => void = () => {};
  @Input() class?: string = '';
  @Input() style?: { [key: string]: string } = {};
  @Input() headerClass?: string = '';
  @Input() headerStyle?: { [key: string]: string } = {};
  @Input() itemClass?: string = '';
  @Input() itemStyle?: { [key: string]: string } = {};
  @Input() id?: string = '';
  @Input() createButton: boolean = true;
  @Input() updateButton: boolean = true;
  @Input() deleteButton: boolean = true;
}