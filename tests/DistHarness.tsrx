import { useMachine } from "../dist"

export default function DistHarness({ machine, machineProps, onReady }: any) @{
    const service = useMachine(machine, machineProps ?? {})
    onReady(service)
}
