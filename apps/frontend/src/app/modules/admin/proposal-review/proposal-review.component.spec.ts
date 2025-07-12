import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { of } from 'rxjs';
import { provideMockMatIconRegistry } from '../../../../testing/mock-icon-registry';

import { ProposalReviewComponent } from './proposal-review.component';

describe('ProposalReviewComponent (Admin)', () => {
  let component: ProposalReviewComponent;
  let fixture: ComponentFixture<ProposalReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ProposalReviewComponent,
        NoopAnimationsModule,
        HttpClientTestingModule,
        RouterTestingModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDialogModule,
        MatChipsModule
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '123' }),
            queryParams: of({}),
            snapshot: { params: { id: '123' }, queryParams: {} }
          }
        },
        provideMockMatIconRegistry()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProposalReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize component properties', () => {
    expect(component.currentProject).toBeNull();
    expect(component.currentUser).toBeNull();
    expect(component.proposalContent).toBe('');
    expect(component.isLoading).toBeFalsy();
  });

  it('should update proposal stats on content change', () => {
    const testContent = 'This is a test proposal content';
    component.proposalContent = testContent;
    component.updateProposalStats();
    
    expect(component.charCount).toBe(testContent.length);
    expect(component.wordCount).toBeGreaterThan(0);
    expect(component.lineCount).toBe(1);
  });

  it('should handle proposal content change event', () => {
    const mockEvent = {
      target: { value: 'New proposal content' }
    } as any;
    
    component.onProposalContentChange(mockEvent);
    expect(component.proposalContent).toBe('New proposal content');
  });

  it('should reset proposal to original content', () => {
    component.originalProposal = 'Original content';
    component.proposalContent = 'Modified content';
    
    component.resetProposal();
    expect(component.proposalContent).toBe('Original content');
  });

  it('should regenerate proposal', async () => {
    spyOn(component as any, 'generateInitialProposal').and.returnValue(Promise.resolve());
    
    await component.regenerateProposal();
    expect((component as any).generateInitialProposal).toHaveBeenCalled();
  });

  it('should validate proposal before sending', () => {
    component.proposalContent = '';
    spyOn(component as any, 'showError');
    
    component.sendProposal();
    expect((component as any).showError).toHaveBeenCalledWith('❌ La propuesta no puede estar vacía');
  });

  it('should format date correctly', () => {
    const testDate = '2024-01-01T00:00:00Z';
    const formatted = component.formatDate(testDate);
    expect(formatted).toBeTruthy();
  });

  it('should get correct platform badge class', () => {
    expect(component.getPlatformBadgeClass('workana')).toBe('bg-blue-100 text-blue-800');
    expect(component.getPlatformBadgeClass('upwork')).toBe('bg-green-100 text-green-800');
  });
});