import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { provideMockMatIconRegistry } from '../../../../../testing/mock-icon-registry';
import { of } from 'rxjs';

describe('proposal-reviewComponent', () => {
  let component: any;
  let fixture: ComponentFixture<any>;

  beforeEach(async () => {
    // Import the component dynamically to avoid import issues
    const componentModule = await import('./proposal-review.component');
    const ComponentClass = Object.values(componentModule)[0] as any;

    await TestBed.configureTestingModule({
      imports: [
        ComponentClass,
        NoopAnimationsModule,
        HttpClientTestingModule,
        RouterTestingModule,
        MatIconModule
      ],
      providers: [
        provideMockMatIconRegistry(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({}),
            queryParamMap: of(new Map()),
            snapshot: {
              params: {},
              queryParams: {},
              queryParamMap: new Map()
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentClass);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render without errors', () => {
    expect(() => fixture.detectChanges()).not.toThrow();
  });
});