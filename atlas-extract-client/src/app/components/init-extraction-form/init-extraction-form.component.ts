import { Component, Input } from '@angular/core';
import { Card } from '../../ncss/cards/card/card.component';
import { Button } from '../../ncss/buttons/button/button.component';
import { WarningIcon } from '../../ncss/icons/warning.icon';

@Component({
  selector: 'app-init-extraction-form',
  imports: [Card, Button, WarningIcon],
  templateUrl: './init-extraction-form.component.html',
})
export class InitExtractionFormComponent {
  @Input() sourceId!: string;

  public readonly formId = 'init-extraction-form';
}
