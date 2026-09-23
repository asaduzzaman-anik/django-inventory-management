import { zodResolver } from "@hookform/resolvers/zod"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { api, toast } from "../../api/client.ts"
import { fetchPage } from "../../api/paging.ts"
import { ListFilters } from "../../components/ListFilters.tsx"
import { QueryState } from "../../components/QueryState.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { Checkbox } from "../../components/ui/Checkbox.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { Modal } from "../../components/ui/Modal.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { Select } from "../../components/ui/Select.tsx"
import { Table } from "../../components/ui/Table.tsx"
import { useCan } from "../auth/useCan.ts"
import { useListState } from "../../hooks/useListState.ts"
import { applyFieldErrors, formBanner } from "../../utils/apiError.ts"
import { categorySchema, type CategoryValues } from "./schemas.ts"
import type { Category } from "./types.ts"

const emptyCategory: CategoryValues = { name: "", slug: "", parent: "", is_active: true }

export function CategoryListPage() {
  const canAdd = useCan("catalog.add_category")
  const canChange = useCan("catalog.change_category")
  const list = useListState()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Category | null | "new">(null)

  const query = useQuery({
    queryKey: ["categories", list.appliedSearch, list.active, list.page, list.ordering],
    queryFn: () =>
      fetchPage<Category>("/categories/", {
        search: list.appliedSearch,
        is_active: list.active || undefined,
        page: list.page,
        ordering: list.ordering,
      }),
    placeholderData: keepPreviousData,
  })

  const options = useQuery({
    queryKey: ["categories", "options"],
    queryFn: () => fetchPage<Category>("/categories/", { page_size: 100, ordering: "name" }),
  })

  async function save(values: CategoryValues) {
    const payload = {
      name: values.name,
      slug: values.slug,
      parent: values.parent ? Number(values.parent) : null,
      is_active: values.is_active,
    }
    if (editing && editing !== "new") {
      await api.patch(`/categories/${editing.id}/`, payload)
    } else {
      await api.post("/categories/", payload)
    }
    await queryClient.invalidateQueries({ queryKey: ["categories"] })
    toast("Category saved.")
    setEditing(null)
  }

  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold text-stone-900">Categories</h1>
      <ListFilters
        search={list.search}
        onSearch={list.setSearch}
        active={list.active}
        onActive={list.setActive}
        action={
          canAdd ? (
            <Button type="button" onClick={() => setEditing("new")}>
              New category
            </Button>
          ) : null
        }
      />
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        onRetry={() => query.refetch()}
        isEmpty={!query.data?.results.length}
        emptyTitle="No categories"
        emptyMessage="Nothing matches the current search and status filter."
      >
        <Table
          rows={query.data?.results ?? []}
          rowKey={(row) => row.id}
          ordering={list.ordering}
          onSort={list.toggleOrdering}
          columns={[
            { key: "name", header: "Name", sortKey: "name", render: (row) => row.name },
            { key: "slug", header: "Slug", render: (row) => row.slug },
            { key: "parent", header: "Parent", render: (row) => row.parent_name ?? "—" },
            { key: "active", header: "Status", render: (row) => (row.is_active ? "Active" : "Inactive") },
            {
              key: "edit",
              header: "",
              render: (row) =>
                canChange ? (
                  <button type="button" className="text-teal-800 underline" onClick={() => setEditing(row)}>
                    Edit
                  </button>
                ) : null,
            },
          ]}
        />
        <Pagination page={list.page} count={query.data?.count ?? 0} onPage={list.setPage} />
      </QueryState>
      {editing ? (
        <CategoryModal
          category={editing === "new" ? null : editing}
          parents={(options.data?.results ?? []).filter((item) => item.parent === null)}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      ) : null}
    </section>
  )
}

function CategoryModal({
  category,
  parents,
  onClose,
  onSave,
}: {
  category: Category | null
  parents: Category[]
  onClose: () => void
  onSave: (values: CategoryValues) => Promise<void>
}) {
  const [banner, setBanner] = useState("")
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          slug: category.slug,
          parent: category.parent ? String(category.parent) : "",
          is_active: category.is_active,
        }
      : emptyCategory,
  })
  const mutation = useMutation({
    mutationFn: onSave,
  })

  return (
    <Modal title={category ? "Edit category" : "New category"} onClose={onClose}>
      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setBanner("")
          try {
            await mutation.mutateAsync(values)
          } catch (error) {
            applyFieldErrors(error, setError)
            setBanner(formBanner(error))
          }
        })}
      >
        {banner ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{banner}</p> : null}
        <Input label="Name" error={errors.name?.message} {...register("name")} />
        <Input label="Slug" error={errors.slug?.message} {...register("slug")} />
        <Select label="Parent" error={errors.parent?.message} {...register("parent")}>
          <option value="">None</option>
          {parents
            .filter((item) => item.id !== category?.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </Select>
        <Checkbox label="Active" {...register("is_active")} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save category"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
