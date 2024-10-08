import {
    Component,
    ElementRef,
    HostListener,
    OnInit,
    ViewChild,
} from '@angular/core';
import { GestorService } from '../../../services/gestor.service';
import { RadicarService } from '../../../services/radicar.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpService } from '../../../services/http.service';
import { DatosSolicitudRequest } from '../../../models/solicitudes/datosSolicitudRequest';
import { OficioComponent } from '../../utilidades/oficio/oficio.component';
import {
    DatosAvalSolicitud,
    DetallesRechazo,
} from '../../../models/indiceModelos';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UtilidadesService } from '../../../services/utilidades.service';
import { Router } from '@angular/router';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FormulariorechazoComponent } from '../../gestion-coordinacion/complementos/formulariorechazo/formulariorechazo.component';

@Component({
    selector: 'app-visoraval',
    templateUrl: './visoraval.component.html',
    styleUrls: ['./visoraval.component.scss'],
    providers: [DialogService, ConfirmationService, MessageService],
})
export class VisoravalComponent implements OnInit {
    @HostListener('window:beforeunload', ['$event'])
    beforeUnloadHander(event: Event) {
        event.returnValue = true;
        return '¿Estás seguro de que quieres salir de la página?';
    }

    @ViewChild(OficioComponent) oficio: OficioComponent;
    @ViewChild('firmaImage') firmaImage: ElementRef;

    mostrarOficio: boolean = false;
    mostrarBtnFirmar: boolean = false;
    mostrarBtnRechazar: boolean = false;
    firmaEnProceso: boolean = false;
    mostrarBtnAvalar: boolean = false;
    mostrarPFSet: boolean = true;
    habilitarAval: boolean = false;
    avalEnProceso: boolean = false;
    rechazoEnProceso: boolean = false;
    deshabilitarRechazo: boolean = false;
    deshabilitarAval: boolean = false;
    cargandoDatos: boolean = true;

    urlPdf: SafeResourceUrl;

    documentosAdjuntos: File[] = [];
    enlacesAdjuntos: string[] = [];

    ref: DynamicDialogRef;

    constructor(
        public gestor: GestorService,
        public radicar: RadicarService,
        public http: HttpService,
        private router: Router,
        private sanitizer: DomSanitizer,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private utilidades: UtilidadesService,
        public dialogService: DialogService
    ) {}

    ngOnInit(): void {
        try {
            this.cargarDatosOficio();
        } catch (error) {
            const isExpectedError =
                error instanceof TypeError &&
                error.message.includes('idSolicitud');

            if (isExpectedError) {
                this.router.navigate(['/gestionsolicitudes/avales/pendientes']);
            } else {
                console.error('Error no esperado:', error);
            }
        }
    }

    capturarInformacionAdjunta() {
        if (this.radicar.datosAsignaturasExternas?.length > 0) {
            this.radicar.datosAsignaturasExternas.forEach((asignatura) => {
                if (asignatura.contenidos) {
                    this.documentosAdjuntos.push(asignatura.contenidos);
                }
                if (asignatura.cartaAceptacion) {
                    this.documentosAdjuntos.push(asignatura.cartaAceptacion);
                }
            });
        }

        if (this.radicar.datosAsignaturasAHomologar?.length > 0) {
            this.radicar.datosAsignaturasAHomologar.forEach((asignatura) => {
                if (asignatura.contenidos) {
                    this.documentosAdjuntos.push(asignatura.contenidos);
                }
            });
        }

        if (this.radicar.documentosAdjuntos?.length > 0) {
            this.documentosAdjuntos = this.documentosAdjuntos.concat(
                this.radicar.documentosAdjuntos
            );
        }

        if (this.radicar.adjuntosDeActividades) {
            Object.values(this.radicar.adjuntosDeActividades).forEach(
                (adjuntosActividad) => {
                    if (adjuntosActividad) {
                        if (adjuntosActividad.archivos?.length > 0) {
                            this.documentosAdjuntos.push(
                                ...adjuntosActividad.archivos
                            );
                        }
                        if (adjuntosActividad.enlaces?.length > 0) {
                            this.enlacesAdjuntos.push(
                                ...adjuntosActividad.enlaces
                            );
                        }
                    }
                }
            );
        }
    }

    cargarDatosOficio() {
        this.http
            .obtenerInfoSolGuardada(
                this.radicar.tipoSolicitudEscogida.idSolicitud
            )
            .subscribe(
                async (infoSolicitud: DatosSolicitudRequest) => {
                    await this.radicar.poblarConDatosSolicitudGuardada(
                        infoSolicitud
                    );
                    this.mostrarOficio = true;
                    this.mostrarBtnAvalar = true;
                    this.mostrarBtnRechazar = true;
                    this.capturarInformacionAdjunta();
                    this.cargandoDatos = false;
                },
                (error) => {
                    console.error(
                        'Error al cargar la informacion de la solicitud:',
                        error
                    );
                }
            );
    }

    onUpload(event, firmante) {
        const rol: any = 'Tutor';
        //const rol: any = 'Director';
        const reader = new FileReader();

        switch (rol) {
            case 'Tutor':
                this.radicar.firmaTutor = event.files[0];
                this.renderizarImagen(this.radicar.firmaTutor, rol);

                reader.onload = (e) => {
                    this.firmaImage.nativeElement.src = e.target.result;
                };
                reader.readAsDataURL(this.radicar.firmaTutor);

                break;

            case 'Director':
                this.radicar.firmaDirector = event.files[0];
                this.renderizarImagen(this.radicar.firmaDirector, rol);

                reader.onload = (e) => {
                    this.firmaImage.nativeElement.src = e.target.result;
                };
                reader.readAsDataURL(this.radicar.firmaDirector);

                break;

            default:
                break;
        }
        firmante.clear();
        this.mostrarBtnFirmar = true;
    }

    firmarSolicitud() {
        this.firmaEnProceso = true;

        setTimeout(() => {
            this.mostrarOficio = false;

            setTimeout(() => {
                this.mostrarOficio = true;
                this.firmaEnProceso = false;
                this.mostrarBtnFirmar = false;
                this.habilitarAval = true;
            }, 100);
        }, 100);
    }

    async enviarOficioAvalado() {
        if (
            this.avalEnProceso ||
            this.firmaEnProceso ||
            this.rechazoEnProceso
        ) {
            return;
        }

        if (this.habilitarAval) {
            this.avalEnProceso = true;
            this.deshabilitarRechazo = true;

            await this.convertirOficioEnPDF();

            const convertirFileABase64 = async (file: File | null) =>
                file ? await this.utilidades.convertirFileABase64(file) : null;

            const aval: DatosAvalSolicitud = {
                idSolicitud: this.radicar.tipoSolicitudEscogida.idSolicitud,
                firmaTutor: await convertirFileABase64(this.radicar.firmaTutor),
                firmaDirector: await convertirFileABase64(
                    this.radicar.firmaDirector
                ),
                documentoPdfSolicitud: await convertirFileABase64(
                    this.radicar.oficioDeSolicitud
                ),
            };

            console.log(aval);

            this.http.guardarAvalesSolicitud(aval).subscribe(
                (resultado) => {
                    if (resultado) {
                        //this.gestor.ejecutarCargarSolicitudes();
                        this.avalEnProceso = false;
                        this.confirmationService.confirm({
                            message: 'La solicitud se ha avalado exitosamente',
                            header: 'Solicitud avalada',
                            icon: 'pi pi-exclamation-circle',
                            acceptLabel: 'Aceptar',
                            rejectVisible: false,
                            accept: () => {
                                this.mostrarBtnRechazar = false;
                                this.mostrarBtnAvalar = false;
                                this.mostrarPFSet = false;
                            },
                            reject: () => {
                                this.mostrarBtnRechazar = false;
                                this.mostrarBtnAvalar = false;
                                this.mostrarPFSet = false;
                            },
                        });
                    } else {
                        this.avalEnProceso = false;
                        this.confirmationService.confirm({
                            message:
                                'Ha ocurrido un error inesperado al avalar la solicitud, intentelo nuevamente.',
                            header: 'Error de aval',
                            icon: 'pi pi-exclamation-triangle',
                            acceptLabel: 'Aceptar',
                            rejectVisible: false,
                            accept: () => {},
                        });
                    }
                },
                (error) => {
                    console.error('Error al enviar la solicitud:', error);
                }
            );
        } else {
            this.showWarn();
        }
    }

    rechazarSolicitud() {
        if (this.rechazoEnProceso || this.avalEnProceso) {
            return;
        }

        this.rechazoEnProceso = true;

        this.ref = this.dialogService.open(FormulariorechazoComponent, {
            header: 'No avalar solicitud',
            width: '60%',
            contentStyle: { 'max-height': '600px', overflow: 'hidden' },
            baseZIndex: 10000,
        });

        this.ref.onClose.subscribe((motivoRechazo: string) => {
            if (motivoRechazo !== undefined) {
                //lsierra@unicauca.edu.co
                //luz123@unicauca.edu.co
                const detalles: DetallesRechazo = {
                    idSolicitud: this.radicar.tipoSolicitudEscogida.idSolicitud,
                    emailRevisor: 'luz123@unicauca.edu.co',
                    estado: 'NO_AVALADA',
                    comentario: motivoRechazo,
                };

                this.http.rechazarSolicitud(detalles).subscribe(
                    (resultado) => {
                        if (resultado) {
                            this.rechazoEnProceso = false;
                            this.confirmationService.confirm({
                                message:
                                    'La solicitud se ha sido rechazada y se ha notificado al solicitante',
                                header: 'Solicitud no avalada',
                                icon: 'pi pi-exclamation-circle',
                                acceptLabel: 'Aceptar',
                                rejectVisible: false,
                                accept: () => {
                                    this.mostrarBtnRechazar = false;
                                    this.mostrarBtnAvalar = false;
                                    this.mostrarPFSet = false;
                                },
                                reject: () => {
                                    this.mostrarBtnRechazar = false;
                                    this.mostrarBtnAvalar = false;
                                    this.mostrarPFSet = false;
                                },
                            });
                        } else {
                            this.rechazoEnProceso = false;
                            this.confirmationService.confirm({
                                message:
                                    'Ha ocurrido un error inesperado al rechazar la solicitud, intentelo nuevamente.',
                                header: 'Error al rechazar',
                                icon: 'pi pi-exclamation-triangle',
                                acceptLabel: 'Aceptar',
                                rejectVisible: false,
                                accept: () => {},
                            });
                        }
                    },
                    (error) => {
                        console.error('Error al rechazar la solicitud:', error);
                    }
                );
            } else {
                // El diálogo se cerró sin confirmar
                this.rechazoEnProceso = false;
            }
        });
    }

    renderizarImagen(imagen: File, firmante: string): void {
        const reader = new FileReader();
        reader.onload = () => {
            switch (firmante) {
                case 'Tutor':
                    this.radicar.firmaTutorUrl = reader.result as string;
                    break;
                case 'Director':
                    this.radicar.firmaDirectorUrl = reader.result as string;
                    break;

                default:
                    break;
            }
        };
        reader.readAsDataURL(imagen);
    }

    convertirOficioEnPDF(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.oficio) {
                this.oficio
                    .crearPDF()
                    .then(() => {
                        resolve();
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } else {
                resolve();
            }
        });
    }

    abrirArchivo(nombreDocumento: string) {
        // Buscar el archivo por su nombre
        const documento = this.documentosAdjuntos.find(
            (doc) => doc.name === nombreDocumento
        );

        if (documento) {
            const tipoMIME = 'application/pdf';
            // Crear una nueva instancia de Blob con el tipo MIME especificado
            const blob = new Blob([documento], { type: tipoMIME });

            // Crear la URL segura
            const url = URL.createObjectURL(blob);
            this.urlPdf = this.sanitizer.bypassSecurityTrustResourceUrl(url);

            console.log(this.urlPdf);
        }
    }

    abrirEnlace(enlace: string): void {
        if (enlace) {
            const enlaceCompleto = enlace.startsWith('http')
                ? enlace
                : 'http://' + enlace;
            window.open(enlaceCompleto, '_blank');
        }
    }

    showWarn() {
        this.messageService.add({
            severity: 'warn',
            summary: 'Oficio no firmado',
            detail: 'Firme el oficio de la solicitud',
        });
    }

    mostrarFormularioRechazo() {
        this.ref = this.dialogService.open(FormulariorechazoComponent, {
            header: 'Choose a Product',
            width: '70%',
            contentStyle: { 'max-height': '500px', overflow: 'auto' },
            baseZIndex: 10000,
        });

        /*
        this.ref.onClose.subscribe((product: Product) => {
            if (product) {
                this.messageService.add({
                    severity: 'info',
                    summary: 'Product Selected',
                    detail: product.name,
                });
            }
        });
        */
    }
}
