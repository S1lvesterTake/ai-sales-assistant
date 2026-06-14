import { render, screen } from "@testing-library/react";

import HomePage from "@/app/(marketing)/page";

describe("HomePage", () => {
  it("renders the product heading and summary", () => {
    render(<HomePage />);

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
