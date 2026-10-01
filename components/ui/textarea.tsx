import { cn } from "cn";
import * as React from "react";

import { fieldClass } from "./input";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldClass, "min-h-24 resize-y px-3 py-3 leading-5", className)}
      {...props}
    />
  );
}

export { Textarea };
