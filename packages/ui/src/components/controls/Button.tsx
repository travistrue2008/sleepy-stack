import styled from '@emotion/styled'
import { Link } from 'react-router'
import type { ReactNode } from 'react'
import type { Theme } from '@emotion/react'

export enum Mode {
  Button = 'Button',
  Link = 'Link',
}

const buttonStyles = ({ theme }: { theme: Theme }) => ({
  display: 'inline-block',
  minWidth: '16rem',
  fontFamily: theme.font.body,
  fontSize: theme.fontSize['2xl'],
  padding: '1rem 3rem',
  border: 'none',
  borderRadius: theme.radius.sm,
  background: theme.color.interactive,
  color: theme.color.interactiveText,
  textAlign: 'center' as const,
  textDecoration: 'none',
  cursor: 'pointer',
})

const disabledStyles = {
  opacity: 0.5,
  cursor: 'not-allowed',
  pointerEvents: 'none' as const,
}


const StyledButton = styled.button<{
  disabled?: boolean | undefined,
}>(
  buttonStyles,
  props => props.disabled && disabledStyles,
)

const StyledLink = styled(Link)<{
  disabled?: boolean | undefined,
}>(
  buttonStyles,
  props => props.disabled && disabledStyles,
)

export type ButtonProps = {
  disabled?: boolean
  children: ReactNode
} & (
  | {
    mode: Mode.Link
    to: string
  }
  | {
    mode: Mode.Button
    onClick?: () => void
  }
)

export default function Button (props: ButtonProps) {
  switch (props.mode) {
    case Mode.Link:
      return (
        <StyledLink
          to={props.to}
          disabled={props.disabled}
          aria-disabled={props.disabled}
        >{props.children}</StyledLink>
      )

    case Mode.Button:
      return (
        <StyledButton
          onClick={props.onClick}
          disabled={props.disabled}
        >{props.children}</StyledButton>
      )
  }
}
