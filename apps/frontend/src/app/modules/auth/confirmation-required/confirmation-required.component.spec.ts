import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('confirmation-requiredComponent', () => {
  let component: any;
  let fixture: ComponentFixture<any>;

  beforeEach(async () => {
    // Import the component dynamically to avoid import issues
    const componentModule = await import('./confirmation-required.component');
    const ComponentClass = Object.values(componentModule)[0] as any;

    await TestBed.configureTestingModule({
      imports: [
        ComponentClass,
        NoopAnimationsModule,
        HttpClientTestingModule
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
