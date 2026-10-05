export default function AppError({ error }: { error: Error }) {
  if (error instanceof Error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-red-500">{error.message}</div>
      </div>
    )
  }

  return <div>Unknown error</div>
}
