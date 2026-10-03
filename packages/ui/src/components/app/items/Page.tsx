import React from 'react'
import styled from '@emotion/styled'
import api from '../../../api'
import { Link } from 'react-router'

import type { Item } from '../../../types'

const Container = styled.main(({ theme }) => ({
  minHeight: '100vh',
  padding: '2rem',
  background: theme.color.background,
  color: theme.color.textPrimary,
  fontFamily: theme.font.body,
}))

const Header = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '2rem',
})

const Title = styled.h1(({ theme }) => ({
  fontSize: theme.fontSize['3xl'],
  margin: 0,
}))

const BackLink = styled(Link)(({ theme }) => ({
  color: theme.color.accent,
  textDecoration: 'none',
  fontSize: theme.fontSize.md,
}))

const Form = styled.form(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing['0.5'],
  marginBottom: '2rem',
}))

const Input = styled.input(({ theme }) => ({
  padding: theme.spacing['0.5'],
  borderRadius: theme.radius.sm,
  border: `1px solid ${theme.color.border}`,
  background: theme.color.surface,
  color: theme.color.textPrimary,
  fontSize: theme.fontSize.md,
  flex: 1,
}))

const SubmitButton = styled.button(({ theme }) => ({
  padding: `${theme.spacing['0.5']} ${theme.spacing['1']}`,
  borderRadius: theme.radius.sm,
  border: 'none',
  background: theme.color.interactive,
  color: theme.color.interactiveText,
  fontSize: theme.fontSize.md,
  cursor: 'pointer',
}))

const List = styled.ul({
  listStyle: 'none',
  padding: 0,
  margin: 0,
})

const ListItem = styled.li(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing['1'],
  borderBottom: `1px solid ${theme.color.border}`,
}))

const ItemInfo = styled.div({
  flex: 1,
})

const ItemName = styled.span(({ theme }) => ({
  fontSize: theme.fontSize.lg,
  fontWeight: 600,
  display: 'block',
  color: theme.color.textPrimary,
}))

const ItemDescription = styled.span(({ theme }) => ({
  fontSize: theme.fontSize.sm,
  color: theme.color.textSecondary,
}))

const DeleteButton = styled.button(({ theme }) => ({
  padding: `${theme.spacing['0.25']} ${theme.spacing['0.75']}`,
  borderRadius: theme.radius.sm,
  border: 'none',
  background: theme.color.wrong,
  color: '#fff',
  fontSize: theme.fontSize.sm,
  cursor: 'pointer',
}))

const Empty = styled.p(({ theme }) => ({
  color: theme.color.textSecondary,
  fontSize: theme.fontSize.lg,
  textAlign: 'center',
  padding: theme.spacing['4'],
}))

export default function Page () {
  const [items, setItems] = React.useState<Item[]>([])
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  const fetchItems = React.useCallback(async () => {
    try {
      const res = await api.get('/items')
      const data = await res.json()

      setItems(data)
    } catch {
      setItems([])
    }

    setLoading(false)
  }, [])

  React.useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!name.trim()) {return}

      await api.post('/items', {
        body: {
          name,
          description,
        },
      })

      setName('')
      setDescription('')
      await fetchItems()
    },
    [name, description, fetchItems],
  )

  const handleDelete = React.useCallback(
    async (id: number) => {
      await api.delete(`/items/${id}`)
      await fetchItems()
    },
    [fetchItems],
  )

  if (loading) {
    return (
      <Container>
        <p>Loading...</p>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <Title>Items</Title>
        <BackLink to="/">Back</BackLink>
      </Header>

      <Form onSubmit={handleSubmit}>
        <Input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <SubmitButton type="submit">Add</SubmitButton>
      </Form>

      {items.length === 0 ? (
        <Empty>No items yet. Add one above.</Empty>
      ) : (
        <List>
          {items.map((item) => (
            <ListItem key={item.id}>
              <ItemInfo>
                <ItemName>{item.name}</ItemName>
                {item.description && (
                  <ItemDescription>
                    {item.description}
                  </ItemDescription>
                )}
              </ItemInfo>
              <DeleteButton onClick={() => {
                handleDelete(item.id)
              }}
              >Delete</DeleteButton>
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  )
}
