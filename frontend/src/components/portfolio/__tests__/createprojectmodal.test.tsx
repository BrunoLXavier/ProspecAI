import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

// Mock translations (next-intl is not required for these assertions)
jest.mock('next-intl', () => ({ useTranslations: () => ((k: string) => k) }));

describe('CreateProjectModal permission guard', () => {
  beforeEach(() => jest.resetModules());

  test('shows permission message when user is not admin and has no institutes', async () => {
    jest.doMock('@/contexts/AuthContext', () => ({
      useAuth: () => ({ user: { roles: [] }, selectedInstitutes: [] }),
    }));

    const { default: CreateProjectModal } = await import('../createprojectmodal');

    render(<CreateProjectModal isOpen={true} onClose={() => {}} />);

    expect(await screen.findByText(/noPermissionTitle|Permission required/i)).toBeInTheDocument();
  });

  test('does not show permission message when user is admin', async () => {
    jest.doMock('@/contexts/AuthContext', () => ({
      useAuth: () => ({ user: { roles: ['admin'] }, selectedInstitutes: [] }),
    }));

    const { default: CreateProjectModal } = await import('../createprojectmodal');

    render(<CreateProjectModal isOpen={true} onClose={() => {}} />);

    expect(screen.queryByText(/noPermissionTitle|Permission required/i)).not.toBeInTheDocument();
  });
});
