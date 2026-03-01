import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { VacationService } from './vacation.service';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { UpdateVacationDto } from './dto/update-vacation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('vacation')
export class VacationController {
    constructor(private readonly vacationService: VacationService) { }

    @Post()
    create(@Body() createVacationDto: CreateVacationDto) {
        return this.vacationService.create(createVacationDto);
    }

    @Get()
    findAll() {
        return this.vacationService.findAll();
    }

    @Get('employee/:carnet')
    findByEmployee(@Param('carnet') carnet: string) {
        return this.vacationService.findByEmployee(carnet);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.vacationService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateVacationDto: UpdateVacationDto,
    ) {
        return this.vacationService.update(id, updateVacationDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.vacationService.remove(id);
    }
}
