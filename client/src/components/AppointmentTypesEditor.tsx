import { useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Trash2, Plus } from "lucide-react";
import { nanoid } from "nanoid";

interface AppointmentTypesEditorProps {
  control: any;
  name: string;
}

export default function AppointmentTypesEditor({ control, name }: AppointmentTypesEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const addAppointmentType = () => {
    append({
      id: nanoid(),
      name: "",
      duration: 30,
      description: "",
      price: 0,
      color: "#3B82F6",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Appointment Types</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAppointmentType}
          disabled={fields.length >= 20}
          data-testid="button-add-appointment-type"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Type
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">No appointment types configured</p>
          <Button
            type="button"
            variant="outline"
            onClick={addAppointmentType}
            data-testid="button-add-first-appointment"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First Appointment Type
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={field.id} className="p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h5 className="font-medium">Appointment Type {index + 1}</h5>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    data-testid={`button-remove-appointment-${index}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name={`${name}.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Initial Consultation"
                            data-testid={`input-appointment-name-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`${name}.${index}.duration`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes) *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={5}
                            max={480}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid={`input-appointment-duration-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={control}
                  name={`${name}.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={2}
                          placeholder="Brief description of this appointment type"
                          data-testid={`input-appointment-description-${index}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={control}
                    name={`${name}.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value) * 100))}
                            value={field.value ? (field.value / 100).toFixed(2) : ""}
                            data-testid={`input-appointment-price-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`${name}.${index}.color`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              {...field}
                              type="color"
                              className="w-20 h-10"
                              data-testid={`input-appointment-color-${index}`}
                            />
                            <Input
                              {...field}
                              type="text"
                              placeholder="#3B82F6"
                              className="flex-1"
                              data-testid={`input-appointment-color-text-${index}`}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {fields.length > 0 && fields.length < 20 && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={addAppointmentType}
          data-testid="button-add-another-appointment"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Type
        </Button>
      )}
    </div>
  );
}