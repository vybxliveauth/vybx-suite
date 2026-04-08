import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Pagination } from "../../apps/admin/src/components/pro/Pagination";

describe("Pagination", () => {
  const defaultProps = {
    page: 1,
    totalPages: 5,
    total: 100,
    pageSize: 20,
    onPageChange: vi.fn(),
  };

  it("renders page info text", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText(/1–20 de 100/)).toBeInTheDocument();
  });

  it("renders current page / total pages", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
  });

  it("disables previous button on first page", () => {
    render(<Pagination {...defaultProps} page={1} />);
    expect(screen.getByLabelText("Página anterior")).toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(<Pagination {...defaultProps} page={5} />);
    expect(screen.getByLabelText("Página siguiente")).toBeDisabled();
  });

  it("calls onPageChange with next page when clicking next", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} page={2} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByLabelText("Página siguiente"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange with prev page when clicking previous", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} page={3} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByLabelText("Página anterior"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables both buttons when isLoading is true", () => {
    render(<Pagination {...defaultProps} page={2} isLoading={true} />);
    expect(screen.getByLabelText("Página anterior")).toBeDisabled();
    expect(screen.getByLabelText("Página siguiente")).toBeDisabled();
  });

  it("returns null when totalPages <= 1", () => {
    const { container } = render(<Pagination {...defaultProps} totalPages={1} total={15} />);
    expect(container.firstChild).toBeNull();
  });

  it("computes correct 'from' and 'to' on last page", () => {
    // 95 total, pageSize=20, page=5 → from=81, to=95
    render(<Pagination {...defaultProps} page={5} total={95} totalPages={5} />);
    expect(screen.getByText(/81–95 de 95/)).toBeInTheDocument();
  });
});
