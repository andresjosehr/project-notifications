import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { provideMockMatIconRegistry } from '../../../../testing/mock-icon-registry';

describe('reset-passwordComponent', () => {
  let component: any;
  let fixture: ComponentFixture<any>;

  beforeEach(async () => {
    // Import the component dynamically to avoid import issues
    const componentModule = await import('./reset-password.component');
    const ComponentClass = Object.values(componentModule)[0] as any;

    await TestBed.configureTestingModule({
      imports: [
        ComponentClass,
        NoopAnimationsModule,
        HttpClientTestingModule,
        MatIconModule,
        RouterTestingModule
      ],
      providers: [
        provideMockMatIconRegistry(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({}),
            snapshot: {
              params: {},
              queryParams: {},
              url: [],
              fragment: null,
              data: {},
              outlet: 'primary',
              component: null,
              routeConfig: null,
              root: {} as any,
              parent: null,
              firstChild: null,
              children: [],
              pathFromRoot: [],
              paramMap: {
                get: () => null,
                getAll: () => [],
                has: () => false,
                keys: []
              },
              queryParamMap: {
                get: () => null,
                getAll: () => [],
                has: () => false,
                keys: []
              }
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
