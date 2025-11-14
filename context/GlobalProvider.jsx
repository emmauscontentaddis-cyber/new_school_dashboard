'use client'

import React from 'react'
import { AuthProvider } from './AuthContext'
import { ChatProvider } from './ChatContext'
import { ApplicationsProvider } from './ApplicationsContext'
import { ProgramsProvider } from './ProgramsContext'
import AuthLoadingWrapper from './AuthLoadingWrapper'

export function GlobalProvider({ children }) {
  return (
    <AuthProvider>
      <AuthLoadingWrapper>
        <ChatProvider>
          <ApplicationsProvider>
            <ProgramsProvider>
              {children}
            </ProgramsProvider>
          </ApplicationsProvider>
        </ChatProvider>
      </AuthLoadingWrapper>
    </AuthProvider>
  )
}

