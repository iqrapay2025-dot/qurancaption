import { ErrorShell } from "@/components/ErrorShell"

export default function NotFound() {
  return <ErrorShell code="404" title="Page not found" body="The page you are looking for does not exist or has moved." />
}
