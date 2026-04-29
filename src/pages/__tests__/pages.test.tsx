import type { ComponentType } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AuthProvider } from "@shared/lib/auth-context";

import AccountPage from "../account";
import BillingPage from "../billing";
import BoardsPage from "../boards";
import LandingPage from "../landing";
import SettingsPage from "../settings";
import NotFoundPage from "../not-found";
import SignInPage from "../sign-in";
import SignUpPage from "../sign-up";

const staticPages: { Component: ComponentType; heading: string }[] = [
  { Component: LandingPage, heading: "Управляй задачами силой ИИ, а не микроменеджмента" },
  { Component: SignInPage, heading: "С возвращением" },
  { Component: SignUpPage, heading: "Создать аккаунт" },
  { Component: BoardsPage, heading: "Доски" },
  { Component: AccountPage, heading: "Личный кабинет" },
  { Component: BillingPage, heading: "Платежи и тариф" },
  { Component: SettingsPage, heading: "Настройки" },
];

function renderStaticPage(Component: ComponentType) {
  if (Component === SignInPage) {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <Component />
        </AuthProvider>
      </MemoryRouter>,
    );
  }
  if (
    Component === LandingPage ||
    Component === SignUpPage ||
    Component === BoardsPage ||
    Component === AccountPage ||
    Component === BillingPage ||
    Component === SettingsPage
  ) {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <Component />
        </AuthProvider>
      </MemoryRouter>,
    );
  }
  return render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>,
  );
}

describe("Страницы — статические", () => {
  it.each(staticPages)(
    "$heading: рендерится без ошибок и отображает заголовок",
    async ({ Component, heading }) => {
      renderStaticPage(Component);
      expect(
        await screen.findByRole("heading", { name: heading }),
      ).toBeInTheDocument();
    },
  );

  it.each(staticPages)("$heading: непустой DOM", ({ Component }) => {
    const { container } = renderStaticPage(Component);
    expect(container.firstChild).not.toBeNull();
  });
});

describe("NotFoundPage", () => {
  const renderNotFound = () =>
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

  it("отображает код ошибки 404", () => {
    renderNotFound();
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("отображает h1 с текстом об ошибке", () => {
    renderNotFound();
    expect(
      screen.getByRole("heading", { level: 1, name: "Страница не найдена" }),
    ).toBeInTheDocument();
  });

  it("содержит ссылку на главную", () => {
    renderNotFound();
    const link = screen.getByRole("link", { name: /на главную|home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("рендерится без ошибок", () => {
    const { container } = renderNotFound();
    expect(container.firstChild).not.toBeNull();
  });
});
