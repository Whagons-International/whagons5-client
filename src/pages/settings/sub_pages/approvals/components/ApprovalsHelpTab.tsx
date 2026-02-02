import { useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBook,
  faCheckCircle,
  faCircleQuestion,
  faClock,
  faExclamationTriangle,
  faInfoCircle,
  faLock,
  faSquareCheck,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/providers/LanguageProvider";

export const ApprovalsHelpTab = () => {
  const { t } = useLanguage();
  const ta = useCallback((key: string, fallback: string) => t(`settings.approvals.help.${key}`, fallback), [t]);
  return (
    <div className="h-full min-h-0 overflow-y-auto p-6 space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FontAwesomeIcon icon={faBook} className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{ta("title", "Documentación de Aprobaciones")}</h1>
            <p className="text-muted-foreground mt-1">{ta("subtitle", "Guía completa para configurar y usar las aprobaciones de tareas")}</p>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5" />
            {ta("whatAreApprovals.title", "¿Qué son las Aprobaciones?")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-foreground">
            {ta("whatAreApprovals.description", "Las aprobaciones te permiten requerir que usuarios o roles específicos revisen y aprueben tareas antes de que puedan continuar. Esto asegura una supervisión y control adecuados sobre operaciones críticas.")}
          </p>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-white dark:bg-gray-900 rounded-md border border-blue-200 dark:border-blue-800">
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">{ta("whatAreApprovals.useCases", "Casos de Uso")}</div>
              <ul className="text-muted-foreground space-y-1 text-xs list-disc list-inside">
                <li>{ta("whatAreApprovals.useCases.expense", "Aprobaciones de gastos")}</li>
                <li>{ta("whatAreApprovals.useCases.workOrder", "Autorización de órdenes de trabajo")}</li>
                <li>{ta("whatAreApprovals.useCases.compliance", "Verificaciones de cumplimiento de políticas")}</li>
                <li>{ta("whatAreApprovals.useCases.quality", "Revisiones de control de calidad")}</li>
                <li>{ta("whatAreApprovals.useCases.budget", "Aprobaciones de presupuesto")}</li>
              </ul>
            </div>
            <div className="p-3 bg-white dark:bg-gray-900 rounded-md border border-blue-200 dark:border-blue-800">
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">{ta("whatAreApprovals.benefits", "Beneficios")}</div>
              <ul className="text-muted-foreground space-y-1 text-xs list-disc list-inside">
                <li>{ta("whatAreApprovals.benefits.enforce", "Hacer cumplir reglas de negocio")}</li>
                <li>{ta("whatAreApprovals.benefits.audit", "Mantener registros de auditoría")}</li>
                <li>{ta("whatAreApprovals.benefits.prevent", "Prevenir acciones no autorizadas")}</li>
                <li>{ta("whatAreApprovals.benefits.compliance", "Asegurar cumplimiento")}</li>
                <li>{ta("whatAreApprovals.benefits.accountability", "Mejorar la responsabilidad")}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5" />
            {ta("quickStart.title", "Guía de Inicio Rápido")}
          </CardTitle>
          <CardDescription>{ta("quickStart.description", "Sigue estos pasos para configurar tu primera aprobación")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300">
                1
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">{ta("quickStart.step1.title", "Crear Configuración de Aprobación")}</div>
                <p className="text-sm text-muted-foreground">
                  Haz clic en <Badge variant="outline" className="mx-1">{t("settings.approvals.headerActions.add", "Agregar aprobación")}</Badge> y completa la pestaña General con un nombre y descripción. Luego configura la pestaña Reglas con tu tipo de aprobación, disparador y requisitos.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300">
                2
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">{ta("quickStart.step2.title", "Asignar Aprobadores")}</div>
                <p className="text-sm text-muted-foreground">
                  Haz clic en el botón <Badge variant="outline" className="mx-1">{t("settings.approvals.actions.manageApprovers", "Aprobadores")}</Badge> en la columna Acciones. Agrega usuarios o roles que puedan aprobar tareas. Puedes marcar aprobadores como requeridos u opcionales.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300">
                3
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">{ta("quickStart.step3.title", "Asignar a Categoría o Plantilla")}</div>
                <p className="text-sm text-muted-foreground">
                  Ve a <Badge variant="outline" className="mx-1">{t("settings.categories.title", "Categorías")}</Badge> o <Badge variant="outline" className="mx-1">{t("settings.templates.title", "Plantillas")}</Badge> y asigna tu aprobación a la categoría o plantilla apropiada. Las tareas creadas con esa categoría/plantilla requerirán aprobación.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300">
                4
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">{ta("quickStart.step4.title", "Crear Tareas")}</div>
                <p className="text-sm text-muted-foreground">
                  {ta("quickStart.step4.description", "Cuando crees una tarea con la categoría o plantilla asignada, el flujo de aprobación comenzará automáticamente (si el disparador está configurado como \"AL_CREAR\") o se puede activar manualmente.")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{ta("approvalTypes.title", "Tipos de Aprobación")}</CardTitle>
          <CardDescription>{ta("approvalTypes.description", "Elige cómo los aprobadores revisan las tareas")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-600">S</Badge>
                <span className="font-semibold text-foreground">{ta("approvalTypes.sequential.title", "Secuencial")}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {ta("approvalTypes.sequential.description", "Los aprobadores revisan las tareas uno tras otro en orden. Cada aprobador debe completar su revisión antes de que el siguiente pueda comenzar.")}
              </p>
              <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">{ta("approvalTypes.sequential.bestFor", "Ideal para:")}</div>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                <li>{ta("approvalTypes.sequential.bestFor.hierarchical", "Cadenas de aprobación jerárquicas")}</li>
                <li>{ta("approvalTypes.sequential.bestFor.department", "Departamento → Gerente → Director")}</li>
                <li>{ta("approvalTypes.sequential.bestFor.order", "Cuando el orden importa")}</li>
              </ul>
            </div>

            <div className="p-4 border-2 border-emerald-200 dark:border-emerald-800 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-emerald-600">P</Badge>
                <span className="font-semibold text-foreground">{ta("approvalTypes.parallel.title", "Paralela")}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {ta("approvalTypes.parallel.description", "Todos los aprobadores pueden revisar simultáneamente. La aprobación se completa cuando se alcanza el número requerido de aprobaciones.")}
              </p>
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">{ta("approvalTypes.parallel.bestFor", "Ideal para:")}</div>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                <li>{ta("approvalTypes.parallel.bestFor.team", "Aprobaciones basadas en equipos")}</li>
                <li>{ta("approvalTypes.parallel.bestFor.stakeholders", "Múltiples partes interesadas")}</li>
                <li>{ta("approvalTypes.parallel.bestFor.faster", "Cuando se necesita respuesta más rápida")}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trigger Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{ta("triggerTypes.title", "Tipos de Disparador")}</CardTitle>
          <CardDescription>{ta("triggerTypes.description", "¿Cuándo debe comenzar el flujo de aprobación?")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-foreground">ON_CREATE</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {ta("triggerTypes.onCreate.description", "El flujo de aprobación comienza automáticamente cuando se crea una tarea con la categoría o plantilla asignada. Este es el tipo de disparador más común.")}
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faClock} className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-foreground">MANUAL</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {ta("triggerTypes.manual.description", "La aprobación debe iniciarse manualmente por un usuario con permisos apropiados. Útil cuando quieres controlar exactamente cuándo comienzan las aprobaciones.")}
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-foreground">CONDITIONAL</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {ta("triggerTypes.conditional.description", "La aprobación comienza cuando se cumplen condiciones específicas. Puedes configurar condiciones basadas en campos de tarea o campos personalizados.")}
              </p>
              <div className="text-xs text-muted-foreground bg-background p-2 rounded border">
                <strong>Ejemplo:</strong> {ta("triggerTypes.conditional.example", "Iniciar aprobación cuando el estado de la tarea es igual a \"Pendiente de Revisión\" o cuando un campo personalizado \"Monto\" es mayor a $1000.")}
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-foreground">ON_COMPLETE</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {ta("triggerTypes.onComplete.description", "La aprobación se activa cuando una tarea transiciona a un estado finalizado/completado. Útil para firma de QA, aceptación de entregables o verificación del supervisor antes de la finalización.")}
              </p>
              <div className="text-xs text-muted-foreground bg-background p-2 rounded border">
                <strong>Ejemplo:</strong> {ta("triggerTypes.onComplete.example", "Requerir aprobación del gerente antes de que una tarea pueda marcarse como Hecho. La tarea permanecerá en estado \"pendiente de aprobación\" hasta que sea aprobada.")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Statuses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{ta("approvalStatuses.title", "Estados de Aprobación")}</CardTitle>
          <CardDescription>{ta("approvalStatuses.description", "Entendiendo los estados de aprobación de tareas")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  pending
                </Badge>
                <span className="font-medium text-foreground">{ta("approvalStatuses.pending.title", "Pendiente")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{ta("approvalStatuses.pending.description", "Esperando que el/los aprobador(es) revisen")}</p>
            </div>

            <div className="p-3 border rounded-lg bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  approved
                </Badge>
                <span className="font-medium text-foreground">{ta("approvalStatuses.approved.title", "Aprobada")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{ta("approvalStatuses.approved.description", "Todos los aprobadores requeridos han aprobado")}</p>
            </div>

            <div className="p-3 border rounded-lg bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                  rejected
                </Badge>
                <span className="font-medium text-foreground">{ta("approvalStatuses.rejected.title", "Rechazada")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{ta("approvalStatuses.rejected.description", "Uno o más aprobadores rechazaron la tarea")}</p>
            </div>

            <div className="p-3 border rounded-lg bg-gray-50/50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
                  cancelled
                </Badge>
                <span className="font-medium text-foreground">{ta("approvalStatuses.cancelled.title", "Cancelada")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{ta("approvalStatuses.cancelled.description", "El flujo de aprobación fue cancelado")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{ta("configOptions.title", "Opciones de Configuración")}</CardTitle>
          <CardDescription>{ta("configOptions.description", "Ajusta tu flujo de aprobación")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="font-semibold text-foreground mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={faUsers} className="w-4 h-4 text-blue-600" />
                {ta("configOptions.requireAll.title", "Requerir Todos los Aprobadores")}
              </div>
              <p className="text-sm text-muted-foreground">
                {ta("configOptions.requireAll.description", "Cuando está habilitado, todos los aprobadores asignados deben aprobar. Cuando está deshabilitado, puedes establecer un número mínimo de aprobaciones requeridas (útil para aprobaciones paralelas).")}
              </p>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="font-semibold text-foreground mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4 text-red-600" />
                {ta("configOptions.requireComment.title", "Requerir Comentario de Rechazo")}
              </div>
              <p className="text-sm text-muted-foreground">
                {ta("configOptions.requireComment.description", "Cuando está habilitado, los aprobadores deben proporcionar un comentario explicando por qué rechazaron la tarea. Esto ayuda a mantener una comunicación clara y registros de auditoría.")}
              </p>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="font-semibold text-foreground mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={faLock} className="w-4 h-4 text-amber-600" />
                {ta("configOptions.blockEditing.title", "Bloquear Edición Durante Aprobación")}
              </div>
              <p className="text-sm text-muted-foreground">
                {ta("configOptions.blockEditing.description", "Previene modificaciones de tareas mientras la aprobación está pendiente. Esto asegura que los aprobadores revisen el estado exacto de la tarea y previene cambios durante la revisión.")}
              </p>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="font-semibold text-foreground mb-1 flex items-center gap-2">
                <FontAwesomeIcon icon={faClock} className="w-4 h-4 text-purple-600" />
                {ta("configOptions.deadline.title", "Plazo")}
              </div>
              <p className="text-sm text-muted-foreground">
                {ta("configOptions.deadline.description", "Establece un plazo para la finalización de la aprobación. Puede especificarse en horas (ej., 24 horas) o como una fecha específica. Ayuda a asegurar revisiones oportunas.")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigning Approvals */}
      <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
            <FontAwesomeIcon icon={faSquareCheck} className="w-5 h-5" />
            {ta("assigning.title", "Asignar Aprobaciones a Tareas")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                <Badge className="bg-purple-600">Opción 1</Badge>
                {ta("assigning.option1.title", "Aprobación Basada en Categoría")}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {ta("assigning.option1.description", "Asigna una aprobación a una categoría. Todas las tareas creadas con esa categoría requerirán aprobación.")}
              </p>
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                <strong>Pasos:</strong> {ta("assigning.option1.steps", "Configuración → Categorías → Editar Categoría → Seleccionar Aprobación → Guardar")}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                <Badge className="bg-purple-600">Opción 2</Badge>
                {ta("assigning.option2.title", "Aprobación Basada en Plantilla")}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {ta("assigning.option2.description", "Asigna una aprobación a una plantilla. Las tareas creadas desde esa plantilla requerirán aprobación.")}
              </p>
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                <strong>Pasos:</strong> {ta("assigning.option2.steps", "Configuración → Plantillas → Editar Plantilla → Pestaña Reglas → Seleccionar Aprobación → Guardar")}
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">{ta("assigning.tip", "💡 Consejo")}</div>
              <p className="text-xs text-muted-foreground">
                {ta("assigning.tip.description", "Si tanto la categoría como la plantilla tienen aprobaciones asignadas, la aprobación de la plantilla típicamente tiene precedencia.")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{ta("example.title", "Ejemplo: Aprobación de Reparación de AC")}</CardTitle>
          <CardDescription>{ta("example.description", "Guía paso a paso para configurar un flujo de aprobación")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                1
              </div>
              <div>
                <strong className="text-foreground">{ta("example.step1", "Crear Aprobación: Nómbrala \"Aprobación de Gerente para Reparaciones de AC\", establece el tipo como Secuencial, el disparador como AL_CREAR y habilita \"Requerir todos los aprobadores\".")}</strong>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                2
              </div>
              <div>
                <strong className="text-foreground">{ta("example.step2", "Asignar Aprobadores: Haz clic en el botón \"Aprobadores\", agrega el rol de Gerente (o usuarios gerentes específicos), marca como requerido.")}</strong>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                3
              </div>
              <div>
                <strong className="text-foreground">{ta("example.step3", "Asignar a Categoría: Ve a Categorías, edita la categoría \"Mantenimiento\", selecciona la aprobación del menú desplegable, guarda.")}</strong>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                4
              </div>
              <div>
                <strong className="text-foreground">{ta("example.step4", "Crear Tarea: Crea la tarea \"Reparar AC\" con la categoría \"Mantenimiento\". El flujo de aprobación comienza automáticamente, el estado de la tarea se convierte en \"pendiente\".")}</strong>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-300">
                5
              </div>
              <div>
                <strong className="text-foreground">{ta("example.step5", "Gerente Revisa: El gerente recibe notificación, revisa la tarea, aprueba o rechaza. El estado de la tarea se actualiza a \"aprobada\" o \"rechazada\" en consecuencia.")}</strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
            <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5" />
            {ta("bestPractices.title", "Mejores Prácticas")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">{ta("bestPractices.clearNames", "Usa nombres claros: Nombra las aprobaciones de manera descriptiva para que los usuarios entiendan su propósito.")}</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">{ta("bestPractices.setDeadlines", "Establece plazos: Siempre establece plazos razonables para asegurar aprobaciones oportunas.")}</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">{ta("bestPractices.requireComments", "Requerir comentarios: Habilita comentarios de rechazo para mantener una comunicación clara.")}</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">{ta("bestPractices.useRoles", "Usa roles cuando sea posible: Asigna aprobaciones a roles en lugar de usuarios individuales para facilitar el mantenimiento.")}</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">{ta("bestPractices.testWorkflows", "Prueba flujos: Crea tareas de prueba para verificar que los flujos de aprobación funcionen como se espera.")}</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">{ta("bestPractices.documentConditions", "Documenta condiciones: Si usas disparadores condicionales, documenta las condiciones claramente para referencia futura.")}</strong>
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{ta("troubleshooting.title", "Solución de Problemas")}</CardTitle>
          <CardDescription>{ta("troubleshooting.description", "Problemas comunes y soluciones")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 border rounded-lg bg-muted/30">
            <div className="font-semibold text-foreground mb-1">{ta("troubleshooting.notStarting.title", "La aprobación no comienza automáticamente")}</div>
            <p className="text-sm text-muted-foreground">
              {ta("troubleshooting.notStarting.description", "Verifica que el tipo de disparador esté configurado como \"AL_CREAR\" y que la aprobación esté asignada a la categoría o plantilla de la tarea. Asegúrate de que la aprobación esté marcada como \"Activa\".")}
            </p>
          </div>

          <div className="p-3 border rounded-lg bg-muted/30">
            <div className="font-semibold text-foreground mb-1">{ta("troubleshooting.noNotifications.title", "Los aprobadores no reciben notificaciones")}</div>
            <p className="text-sm text-muted-foreground">
              {ta("troubleshooting.noNotifications.description", "Verifica que los aprobadores estén correctamente asignados a la aprobación. Revisa la configuración de notificaciones del usuario y asegúrate de que el flujo de aprobación haya comenzado.")}
            </p>
          </div>

          <div className="p-3 border rounded-lg bg-muted/30">
            <div className="font-semibold text-foreground mb-1">{ta("troubleshooting.stuckPending.title", "La tarea está atascada en estado pendiente")}</div>
            <p className="text-sm text-muted-foreground">
              {ta("troubleshooting.stuckPending.description", "Asegúrate de que todos los aprobadores requeridos hayan revisado la tarea. Verifica si falta algún aprobador o si los requisitos de aprobación están configurados correctamente.")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="pt-6 border-t text-sm text-muted-foreground flex items-center gap-2">
        <FontAwesomeIcon icon={faCircleQuestion} className="w-4 h-4" />
        {ta("footer", "¿Necesitas más ayuda? Pregunta a un administrador o consulta los POE de tu organización.")}
      </div>
    </div>
  );
};

