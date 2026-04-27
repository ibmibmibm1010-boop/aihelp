import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "../ProtectedRoute";

const mockUseAuth = vi.fn();

vi.mock("@shared/lib/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({
      currentUser: null,
      isAuthenticated: true,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("рендерит переданный дочерний элемент", () => {
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Защищённый контент</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText("Защищённый контент")).toBeInTheDocument();
  });

  it("рендерит несколько дочерних элементов", () => {
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <span>Один</span>
          <span>Два</span>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText("Один")).toBeInTheDocument();
    expect(screen.getByText("Два")).toBeInTheDocument();
  });

  it("рендерит вложенные компоненты", () => {
    const Inner = () => <p data-testid="inner">Вложенный</p>;
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <Inner />
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("inner")).toBeInTheDocument();
  });

  it("не добавляет лишних DOM-обёрток (Fragment)", () => {
    const { container } = render(
      <MemoryRouter>
        <ProtectedRoute>
          <div id="child">дочерний</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(container.firstChild).toHaveAttribute("id", "child");
  });
});
