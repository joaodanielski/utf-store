<script setup lang="ts">
defineOptions({ name: 'CreateAdView' })

import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Button from 'primevue/button'

import { useListingStore } from '@/stores/listing'

const listingStore = useListingStore()

const router = useRouter()
const toast = useToast()

const loading = ref(false)
const categoriesLoading = ref(false)

const form = ref({
  title: '',
  description: '',
  price: '',
  categoryId: '',
  type: 'SELL',
  condition: 'NEW',
  location: '',
})

const typeOptions = [
  { label: 'Venda', value: 'SELL' },
  { label: 'Doação', value: 'DONATE' },
]

const conditionOptions = [
  { label: 'Novo', value: 'NEW' },
  { label: 'Usado', value: 'USED' },
]

const categoryOptions = ref<{ label: string; value: string }[]>([])

const MAX_IMAGES = 10
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

interface SelectedImage {
  id: string
  file: File
  previewUrl: string
}

const images = ref<SelectedImage[]>([])
const coverId = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function openFilePicker(): void {
  fileInput.value?.click()
}

function onFilesSelected(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''

  for (const file of files) {
    if (images.value.length >= MAX_IMAGES) {
      toast.add({
        severity: 'warn',
        summary: 'Limite de imagens',
        detail: `Você pode adicionar até ${MAX_IMAGES} imagens.`,
        life: 3000,
      })
      break
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.add({
        severity: 'warn',
        summary: 'Formato inválido',
        detail: `"${file.name}" não é JPG, PNG, WEBP ou GIF.`,
        life: 4000,
      })
      continue
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.add({
        severity: 'warn',
        summary: 'Imagem muito grande',
        detail: `"${file.name}" ultrapassa o limite de 5 MB.`,
        life: 4000,
      })
      continue
    }

    const image: SelectedImage = {
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }
    images.value.push(image)
    if (!coverId.value) coverId.value = image.id
  }
}

function removeImage(id: string): void {
  const image = images.value.find((item) => item.id === id)
  if (image) URL.revokeObjectURL(image.previewUrl)

  images.value = images.value.filter((item) => item.id !== id)
  if (coverId.value === id) coverId.value = images.value[0]?.id ?? null
}

function setCover(id: string): void {
  coverId.value = id
}

function orderedImages(): SelectedImage[] {
  const cover = images.value.find((item) => item.id === coverId.value)
  const others = images.value.filter((item) => item.id !== coverId.value)
  return cover ? [cover, ...others] : others
}

async function uploadImages(listingId: string): Promise<number> {
  let failed = 0

  for (const [position, image] of orderedImages().entries()) {
    try {
      await listingStore.actAddListingImage(listingId, image.file, {
        isCover: image.id === coverId.value,
        position,
      })
    } catch {
      failed += 1
    }
  }

  return failed
}

onBeforeUnmount(() => {
  for (const image of images.value) URL.revokeObjectURL(image.previewUrl)
})

async function fetchCategories(): Promise<void> {
  categoriesLoading.value = true
  try {
    const data = await listingStore.actFindAllCategories()
    const list: { id: string; name: string }[] = Array.isArray(data)
      ? data
      : (data?.categories ?? [])
    categoryOptions.value = list.map((category) => ({ label: category.name, value: category.id }))
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Erro ao carregar categorias',
      detail: 'Não foi possível carregar as categorias.',
      life: 3000,
    })
  } finally {
    categoriesLoading.value = false
  }
}

function goToAds(): void {
  router.push({ name: 'admin.ads' })
}

async function onSubmit(): Promise<void> {
  if (!form.value.title || !form.value.price || !form.value.categoryId) {
    toast.add({
      severity: 'warn',
      summary: 'Campos obrigatórios',
      detail: 'Preencha o título, o preço e a categoria do anúncio.',
      life: 3000,
    })
    return
  }

  const price = Number(String(form.value.price).replace(',', '.'))
  if (Number.isNaN(price) || price < 0) {
    toast.add({
      severity: 'warn',
      summary: 'Preço inválido',
      detail: 'Informe um preço válido, por exemplo 59,90.',
      life: 3000,
    })
    return
  }

  loading.value = true
  try {
    const created = await listingStore.actCreateListing({
      categoryId: form.value.categoryId,
      title: form.value.title,
      description: form.value.description || undefined,
      price: price.toFixed(2),
      condition: form.value.condition,
      type: form.value.type,
      location: form.value.location || undefined,
    })

    const failedUploads = images.value.length ? await uploadImages(created.listing.id) : 0

    if (failedUploads > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Anúncio criado com ressalvas',
        detail: `${failedUploads} imagem(ns) não puderam ser enviadas. Tente adicioná-las novamente.`,
        life: 6000,
      })
    } else {
      toast.add({
        severity: 'success',
        summary: 'Anúncio criado',
        detail: 'O anúncio foi cadastrado com sucesso!',
        life: 3000,
      })
    }

    goToAds()
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Erro ao criar',
      detail: 'Não foi possível salvar o anúncio.',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

onMounted(fetchCategories)
</script>

<template>
  <section class="max-w-3xl mx-auto space-y-6">
    <header
      class="flex items-center justify-between bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100"
    >
      <div>
        <h1 class="text-xl font-bold text-slate-900 tracking-tight">Novo Anúncio</h1>
        <p class="text-sm text-slate-500 mt-0.5">
          Preencha os dados para publicar um item ou serviço.
        </p>
      </div>
      <Button
        label="Voltar"
        icon="pi pi-arrow-left"
        severity="secondary"
        outlined
        class="rounded-xl"
        @click="goToAds"
      />
    </header>

    <div
      class="bg-white rounded-2xl p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100"
    >
      <form class="space-y-5" @submit.prevent="onSubmit">
        <div class="flex flex-col gap-1.5">
          <label for="title" class="text-sm font-semibold text-slate-700">Título do Anúncio</label>
          <InputText
            id="title"
            v-model="form.title"
            placeholder="Ex: Notebook Gamer"
            class="w-full rounded-xl bg-slate-50 border-slate-200 px-4 py-3 text-slate-700"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label for="price" class="text-sm font-semibold text-slate-700">Preço (R$)</label>
            <InputText
              id="price"
              v-model="form.price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              class="w-full rounded-xl bg-slate-50 border-slate-200 px-4 py-3 text-slate-700"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="category" class="text-sm font-semibold text-slate-700">Categoria</label>
            <Select
              id="category"
              v-model="form.categoryId"
              :options="categoryOptions"
              :loading="categoriesLoading"
              option-label="label"
              option-value="value"
              placeholder="Selecione a categoria"
              class="w-full rounded-xl bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="flex flex-col gap-1.5">
            <label for="type" class="text-sm font-semibold text-slate-700">Tipo</label>
            <Select
              id="type"
              v-model="form.type"
              :options="typeOptions"
              option-label="label"
              option-value="value"
              class="w-full rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="condition" class="text-sm font-semibold text-slate-700">Condição</label>
            <Select
              id="condition"
              v-model="form.condition"
              :options="conditionOptions"
              option-label="label"
              option-value="value"
              class="w-full rounded-xl bg-slate-50 border-slate-200"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="location" class="text-sm font-semibold text-slate-700">Localização</label>
            <InputText
              id="location"
              v-model="form.location"
              placeholder="Ex: Dois Vizinhos, PR"
              class="w-full rounded-xl bg-slate-50 border-slate-200 px-4 py-3 text-slate-700"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="description" class="text-sm font-semibold text-slate-700">Descrição</label>
          <Textarea
            id="description"
            v-model="form.description"
            rows="4"
            placeholder="Descreva os detalhes..."
            class="w-full rounded-xl bg-slate-50 border-slate-200 p-4 text-slate-700"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <label class="text-sm font-semibold text-slate-700">Imagens</label>
            <span class="text-xs text-slate-400">{{ images.length }}/{{ MAX_IMAGES }}</span>
          </div>

          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            class="hidden"
            @change="onFilesSelected"
          />

          <button
            type="button"
            class="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700"
            @click="openFilePicker"
          >
            <i class="pi pi-image text-2xl" />
            <span class="text-sm font-medium">Clique para adicionar imagens</span>
            <span class="text-xs text-slate-400">JPG, PNG, WEBP ou GIF · até 5 MB cada</span>
          </button>

          <ul v-if="images.length" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            <li
              v-for="image in images"
              :key="image.id"
              class="relative overflow-hidden rounded-xl border bg-white"
              :class="
                image.id === coverId ? 'border-slate-900 ring-2 ring-slate-900' : 'border-slate-200'
              "
            >
              <img
                :src="image.previewUrl"
                :alt="image.file.name"
                class="h-28 w-full object-cover"
              />

              <span
                v-if="image.id === coverId"
                class="absolute left-2 top-2 rounded-md bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white"
              >
                Capa
              </span>

              <button
                type="button"
                class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
                :aria-label="`Remover ${image.file.name}`"
                @click="removeImage(image.id)"
              >
                <i class="pi pi-times text-xs" />
              </button>

              <button
                v-if="image.id !== coverId"
                type="button"
                class="w-full border-t border-slate-100 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                @click="setCover(image.id)"
              >
                Definir como capa
              </button>
              <div
                v-else
                class="w-full border-t border-slate-100 py-1.5 text-center text-xs text-slate-400"
              >
                Imagem de capa
              </div>
            </li>
          </ul>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" label="Cancelar" severity="secondary" text @click="goToAds" />
          <Button
            type="submit"
            label="Salvar Anúncio"
            icon="pi pi-check"
            :loading="loading"
            class="rounded-xl px-6"
          />
        </div>
      </form>
    </div>
  </section>
</template>
