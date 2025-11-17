'use client'

import React from 'react'
import { AuthProvider } from './AuthContext'
import { ApplicationsProvider } from './ApplicationsContext'
import { ProgramsProvider } from './ProgramsContext'
import AuthLoadingWrapper from './AuthLoadingWrapper'

export function GlobalProvider({ children }) {
  return (
    <AuthProvider>
      <AuthLoadingWrapper>
        <ApplicationsProvider>
          <ProgramsProvider>
            {children}
          </ProgramsProvider>
        </ApplicationsProvider>
      </AuthLoadingWrapper>
    </AuthProvider>
  )
}

