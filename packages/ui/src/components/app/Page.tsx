import styled from '@emotion/styled'
import { Link } from 'react-router'

const Screen = styled.main({
  height: '100vh',
  width: '100vw',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#111',
  color: '#fff',
})

const Content = styled.div({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '3rem',
  marginBottom: '8rem',
})

const Title = styled.h1({
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontWeight: 800,
  fontSize: '6rem',
  margin: 0,
})

const Label = styled.p({
  fontSize: '1.25rem',
  margin: 0,
  color: '#aaa',
})

const NavButton = styled(Link)({
  display: 'inline-block',
  width: '20vw',
  minWidth: '200px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: '1.25rem',
  fontWeight: 600,
  padding: '1rem 0',
  border: 'none',
  borderRadius: '0.5rem',
  background: '#fff',
  color: '#111',
  textAlign: 'center',
  textDecoration: 'none',
  cursor: 'pointer',
})

export default function Page () {
  return (
    <Screen>
      <Content>
        <Title>Example</Title>
        <Label>A sleepy-stack starter template.</Label>
        <NavButton to="/items">Items</NavButton>
      </Content>
    </Screen>
  )
}
