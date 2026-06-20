jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  useRouter: jest.fn().mockReturnValue({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: jest.fn().mockReturnValue("/"),
  useSearchParams: jest.fn().mockReturnValue(new URLSearchParams()),
}));

import { render, screen } from "@testing-library/react";
import { cookies } from "next/headers";

import HomePage from "@/app/(marketing)/page";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

describe("HomePage", () => {
  beforeEach(() => {
    jest.mocked(cookies).mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as CookieStore);
  });

  it("renders the product heading and summary", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /jawab pelanggan lebih cepat/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/membantu UMKM menjawab pertanyaan berulang/i),
    ).toBeInTheDocument();
  });
});
