import axios, { AxiosError } from 'axios'
import { useState } from 'react'
import { useMutation } from 'react-query'

interface Args {
  presignedUploadUrl: string
  file: File
}

export const useFileUploadMutation = (args: Args) => {
  const [progress, setProgress] = useState(0)

  const mutation = useMutation<void, AxiosError, Args>((args) =>
    axios.post(args.presignedUploadUrl, args.file, {
      onUploadProgress: (ev) => setProgress(Math.round((ev.loaded * 100) / ev.total)),
    })
  )

  return { ...mutation, progress }
}
