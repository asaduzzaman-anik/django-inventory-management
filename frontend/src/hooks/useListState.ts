import { useEffect, useState } from "react"

export function useListState(defaultOrdering = "name") {
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [active, setActiveValue] = useState("true")
  const [page, setPage] = useState(1)
  const [ordering, setOrdering] = useState(defaultOrdering)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim()
      setAppliedSearch((current) => {
        if (current !== next) {
          setPage(1)
        }
        return next
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  function setActive(value: string) {
    setActiveValue(value)
    setPage(1)
  }

  function toggleOrdering(key: string) {
    setOrdering((current) => (current === key ? `-${key}` : key))
    setPage(1)
  }

  return {
    search,
    setSearch,
    appliedSearch,
    active,
    setActive,
    page,
    setPage,
    ordering,
    toggleOrdering,
  }
}
